"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { renomearPastaPedido } from "@/lib/drive";
import { permitir } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chaveTipo, normalizarTipo, type ArquivoEnviado, type StatusPedido, type TipoVideo } from "@/lib/etm";
import {
  atualizarPedido,
  criarEvento,
  ehUuid,
  garantirTipo,
  getEtmUser,
  limpar,
  linkValido,
  situacaoEtm,
  prepararUpload,
  registrarArquivos,
  validarArquivos,
  type Resultado,
} from "@/lib/etm-servidor";

export async function entrarEtm(
  _estado: { erro?: string },
  formData: FormData,
): Promise<{ erro?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { erro: "Serviço indisponível." };

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };

  if (!(await getEtmUser())) {
    const { data } = await supabase.auth.getUser();
    const situacao = data.user ? await situacaoEtm(data.user.id) : null;
    await supabase.auth.signOut();
    if (situacao === "pendente") return { erro: "Seu cadastro ainda está aguardando aprovação." };
    if (situacao === "bloqueado") return { erro: "Este acesso foi bloqueado." };
    return { erro: "Esta conta não tem acesso aos pedidos da ETM." };
  }
  redirect("/etm");
}

/** Cadastro feito pela própria pessoa; fica pendente até você aprovar no painel. */
export async function cadastrarEtm(
  _estado: { erro?: string; ok?: boolean },
  formData: FormData,
): Promise<{ erro?: string; ok?: boolean }> {
  const req = new Request("http://local", { headers: await headers() });
  if (!permitir(req, "etm-cadastro", 5, 60 * 60 * 1000)) return { erro: "Muitas tentativas. Tente de novo mais tarde." };

  const nome = limpar(formData.get("nome"), 80);
  const email = limpar(formData.get("email"), 120).toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (nome.length < 2) return { erro: "Informe seu nome." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };
  if (email === process.env.ADMIN_EMAIL?.toLowerCase()) return { erro: "Este e-mail não pode ser usado." };
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };

  const db = supabaseAdmin();
  if (!db) return { erro: "Serviço indisponível." };
  const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) {
    return { erro: error?.message.includes("already") ? "Este e-mail já tem cadastro. Use Entrar." : "Não foi possível criar o cadastro." };
  }
  const { error: erroLinha } = await db.from("etm_usuarios").insert({ user_id: data.user.id, nome, email });
  if (erroLinha) {
    await db.auth.admin.deleteUser(data.user.id);
    return { erro: "Não foi possível registrar o cadastro." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function sairEtm() {
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  redirect("/etm/login");
}

export async function criarUploadUrlEtm(pedidoId: string, nome: string, tamanho: number) {
  if (!(await getEtmUser())) return { ok: false as const, erro: "Sem permissão." };
  return prepararUpload(pedidoId, nome, tamanho);
}

export async function criarPedido(dados: {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  urgente: boolean;
  link: string;
  arquivos: ArquivoEnviado[];
}): Promise<Resultado<{ id: string }>> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(dados.id)) return { ok: false, erro: "Pedido inválido." };

  const titulo = limpar(dados.titulo, 120);
  const descricao = limpar(dados.descricao, 4000);
  if (titulo.length < 3) return { ok: false, erro: "Dê um título ao pedido." };
  if (descricao.length < 10) return { ok: false, erro: "Descreva o que você precisa no vídeo." };
  if (dados.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(dados.prazo)) return { ok: false, erro: "Prazo inválido." };
  const link = linkValido(dados.link);
  if (link === null) return { ok: false, erro: "O link do material precisa começar com http:// ou https://." };
  const arquivos = await validarArquivos(dados.id, dados.arquivos);
  if (typeof arquivos === "string") return { ok: false, erro: arquivos };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const tipo = await garantirTipo(db, dados.tipo);
  if (!tipo) return { ok: false, erro: "Informe o tipo de pedido (de 2 a 40 letras)." };

  const { data: criado, error } = await db.from("etm_pedidos").insert({
    id: dados.id,
    solicitante_id: user.id,
    solicitante_nome: user.nome,
    titulo,
    tipo,
    descricao,
    prazo: dados.prazo || null,
    urgente: !!dados.urgente,
    link_material: link || null,
  }).select("numero").single();
  if (error) return { ok: false, erro: "Não foi possível registrar o pedido." };

  const eventoId = await criarEvento(db, {
    pedido_id: dados.id,
    autor: "etm",
    autor_nome: user.nome,
    tipo: "criado",
    status_novo: "recebido",
  });
  await registrarArquivos(db, dados.id, eventoId, "material", arquivos);
  // a pasta do Drive nasce com o código do pedido; agora que ele tem número e título, ganha um nome legível
  if (criado && arquivos.some((a) => a.path.startsWith("drive:"))) {
    await renomearPastaPedido(db, dados.id, `#${criado.numero} · ${titulo}`);
  }

  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
  return { ok: true, id: dados.id };
}

type Acao = "comentar" | "correcao" | "aprovar";

/** Comentário, pedido de correção ou aprovação, sempre pela pessoa da ETM. */
export async function responderPedido(
  pedidoId: string,
  acao: Acao,
  texto: string,
  arquivos: ArquivoEnviado[],
): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId)) return { ok: false, erro: "Pedido inválido." };

  const msg = limpar(texto, 4000);
  const anexos = await validarArquivos(pedidoId, arquivos);
  if (typeof anexos === "string") return { ok: false, erro: anexos };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const { data: pedido } = await db.from("etm_pedidos").select("status").eq("id", pedidoId).maybeSingle();
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  const status = pedido.status as StatusPedido;

  let novoStatus: StatusPedido | null = null;
  if (acao === "comentar") {
    if (!msg && anexos.length === 0) return { ok: false, erro: "Escreva uma mensagem ou anexe um arquivo." };
  } else {
    if (status !== "em_avaliacao") return { ok: false, erro: "Não há versão aguardando avaliação." };
    if (acao === "correcao") {
      if (msg.length < 5) return { ok: false, erro: "Explique o que precisa ser corrigido." };
      novoStatus = "correcao";
    } else {
      novoStatus = "aprovado";
    }
  }

  const eventoId = await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "etm",
    autor_nome: user.nome,
    tipo: acao === "comentar" ? "comentario" : acao === "correcao" ? "correcao" : "aprovacao",
    texto: msg,
    status_novo: novoStatus,
  });
  await registrarArquivos(db, pedidoId, eventoId, "anexo", anexos);
  await atualizarPedido(db, pedidoId, novoStatus ? { status: novoStatus } : {});

  revalidatePath(`/etm/${pedidoId}`);
  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Cria um tipo de pedido novo (nome e para que serve). Se já existir, devolve o que existe sem mudar a descrição. */
export async function criarTipo(nome: string, descricao: string): Promise<Resultado<{ tipo: TipoVideo }>> {
  if (!(await getEtmUser())) return { ok: false, erro: "Sem permissão." };
  const n = normalizarTipo(nome);
  const d = limpar(descricao, 200);
  if (n.length < 2) return { ok: false, erro: "Dê um nome ao tipo (de 2 a 40 letras)." };
  if (d.length < 10) return { ok: false, erro: "Descreva para que serve esse tipo de pedido (pelo menos 10 letras)." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };

  const { data } = await db.from("etm_tipos").select("rotulo,descricao");
  const igual = (data ?? []).find((t) => chaveTipo(t.rotulo as string) === chaveTipo(n));
  if (igual) return { ok: true, tipo: { rotulo: igual.rotulo as string, descricao: (igual.descricao as string) ?? "" } };

  const { error } = await db.from("etm_tipos").insert({ rotulo: n, descricao: d });
  if (error) return { ok: false, erro: "Não foi possível criar o tipo." };
  revalidatePath("/admin/etm");
  return { ok: true, tipo: { rotulo: n, descricao: d } };
}

/** A ETM responde a uma pergunta de quem produz; a pergunta deixa de ficar em destaque. */
export async function responderDuvida(pedidoId: string, duvidaId: string, texto: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId) || !ehUuid(duvidaId)) return { ok: false, erro: "Pergunta inválida." };
  const msg = limpar(texto, 4000);
  if (msg.length < 2) return { ok: false, erro: "Escreva a resposta." };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const { data: duvida } = await db
    .from("etm_eventos")
    .select("id")
    .eq("id", duvidaId)
    .eq("pedido_id", pedidoId)
    .eq("tipo", "duvida")
    .maybeSingle();
  if (!duvida) return { ok: false, erro: "Pergunta não encontrada." };
  const { data: jaRespondida } = await db.from("etm_eventos").select("id").eq("responde_a", duvidaId).limit(1);
  if (jaRespondida?.length) return { ok: false, erro: "Esta pergunta já foi respondida." };

  await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "etm",
    autor_nome: user.nome,
    tipo: "resposta",
    texto: msg,
    responde_a: duvidaId,
  });
  await atualizarPedido(db, pedidoId);
  revalidatePath(`/etm/${pedidoId}`);
  revalidatePath(`/admin/etm/${pedidoId}`);
  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
