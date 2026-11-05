"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { apagarArquivoDrive, renomearPastaPedido } from "@/lib/drive";
import { permitir } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BUCKET_ETM,
  chaveTipo,
  ehVideo,
  normalizarTipo,
  permissoesMensagem,
  type ArquivoEnviado,
  type Evento,
  type StatusPedido,
  type TipoVideo,
} from "@/lib/etm";
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
      // a correção pode vir só dos comentários marcados nos vídeos
      const { count: marcados } = await db
        .from("etm_comentarios_video")
        .select("*", { count: "exact", head: true })
        .eq("pedido_id", pedidoId)
        .is("correcao_evento_id", null);
      if (msg.length < 5 && (marcados ?? 0) === 0) {
        return { ok: false, erro: "Explique o que precisa ser corrigido ou marque momentos no vídeo." };
      }
      novoStatus = "correcao";
    } else {
      novoStatus = "aprovado";
    }
  }

  const eventoId = await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "etm",
    autor_nome: user.nome,
    autor_id: user.id,
    tipo: acao === "comentar" ? "comentario" : acao === "correcao" ? "correcao" : "aprovacao",
    texto: msg,
    status_novo: novoStatus,
  });
  await registrarArquivos(db, pedidoId, eventoId, "anexo", anexos);
  // os comentários marcados no vídeo passam a pertencer a esta correção
  if (acao === "correcao" && eventoId) {
    await db.from("etm_comentarios_video").update({ correcao_evento_id: eventoId }).eq("pedido_id", pedidoId).is("correcao_evento_id", null);
  }
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
export async function responderDuvida(
  pedidoId: string,
  duvidaId: string,
  texto: string,
  arquivos: ArquivoEnviado[] = [],
): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId) || !ehUuid(duvidaId)) return { ok: false, erro: "Pergunta inválida." };
  const msg = limpar(texto, 4000);
  const anexos = await validarArquivos(pedidoId, arquivos);
  if (typeof anexos === "string") return { ok: false, erro: anexos };
  // basta um caractere, ou só um arquivo anexado
  if (msg.length < 1 && anexos.length === 0) return { ok: false, erro: "Escreva a resposta ou anexe um arquivo." };

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

  const eventoId = await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "etm",
    autor_nome: user.nome,
    autor_id: user.id,
    tipo: "resposta",
    texto: msg,
    responde_a: duvidaId,
  });
  await registrarArquivos(db, pedidoId, eventoId, "anexo", anexos);
  await atualizarPedido(db, pedidoId);
  revalidatePath(`/etm/${pedidoId}`);
  revalidatePath(`/admin/etm/${pedidoId}`);
  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

type EventoMexido = Pick<Evento, "id" | "pedido_id" | "tipo" | "autor" | "autor_id">;

function atualizarTelasDoPedido(pedidoId: string) {
  revalidatePath(`/etm/${pedidoId}`);
  revalidatePath(`/admin/etm/${pedidoId}`);
  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
}

/** Edita o texto de uma mensagem, pergunta ou resposta. Só quem escreveu (ou o dono do painel, nas dele) pode. */
export async function editarMensagem(eventoId: string, texto: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(eventoId)) return { ok: false, erro: "Mensagem inválida." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };

  const { data } = await db.from("etm_eventos").select("id,pedido_id,tipo,autor,autor_id").eq("id", eventoId).maybeSingle();
  const ev = data as EventoMexido | null;
  if (!ev || !permissoesMensagem(ev, { id: user.id, admin: user.admin }).editar) {
    return { ok: false, erro: "Você não pode editar esta mensagem." };
  }
  const msg = limpar(texto, 4000);
  const minimo = ev.tipo === "duvida" ? 5 : ev.tipo === "resposta" ? 1 : 2;
  if (msg.length < minimo) {
    return { ok: false, erro: ev.tipo === "duvida" ? "Escreva a pergunta." : ev.tipo === "resposta" ? "Escreva a resposta." : "Escreva a mensagem." };
  }
  await db.from("etm_eventos").update({ texto: msg, editado_em: new Date().toISOString() }).eq("id", eventoId);
  atualizarTelasDoPedido(ev.pedido_id);
  return { ok: true };
}

/**
 * Exclui uma mensagem, pergunta ou resposta, com os arquivos anexados a ela. Apagar uma pergunta apaga as respostas;
 * apagar uma resposta devolve a pergunta ao estado de "sem resposta".
 */
export async function excluirMensagem(eventoId: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(eventoId)) return { ok: false, erro: "Mensagem inválida." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };

  const { data } = await db.from("etm_eventos").select("id,pedido_id,tipo,autor,autor_id").eq("id", eventoId).maybeSingle();
  const ev = data as EventoMexido | null;
  if (!ev || !permissoesMensagem(ev, { id: user.id, admin: user.admin }).excluir) {
    return { ok: false, erro: "Você não pode excluir esta mensagem." };
  }

  const { data: filhas } = await db.from("etm_eventos").select("id").eq("responde_a", eventoId);
  const ids = [eventoId, ...(filhas ?? []).map((f) => f.id as string)];
  const { data: anexos } = await db.from("etm_arquivos").select("caminho").in("evento_id", ids);
  const caminhos = (anexos ?? []).map((a) => a.caminho as string);
  const doStorage = caminhos.filter((c) => !c.startsWith("drive:"));
  if (doStorage.length) await db.storage.from(BUCKET_ETM).remove(doStorage);
  for (const c of caminhos.filter((c) => c.startsWith("drive:"))) await apagarArquivoDrive(db, c.slice("drive:".length));

  await db.from("etm_eventos").delete().eq("id", eventoId);
  atualizarTelasDoPedido(ev.pedido_id);
  return { ok: true };
}

// ---- comentários marcados no tempo de um vídeo entregue ----

/** Comentário que a pessoa pode mexer: é dela, a versão ainda está em avaliação e ele ainda não foi enviado como correção. */
async function comentarioEditavel(db: NonNullable<ReturnType<typeof supabaseAdmin>>, id: string, userId: string) {
  const { data: c } = await db
    .from("etm_comentarios_video")
    .select("id,pedido_id,autor_id,correcao_evento_id")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.autor_id !== userId || c.correcao_evento_id) return null;
  const { data: p } = await db.from("etm_pedidos").select("status").eq("id", c.pedido_id).maybeSingle();
  return p?.status === "em_avaliacao" ? (c.pedido_id as string) : null;
}

function atualizarTelasDoVideo(pedidoId: string) {
  revalidatePath(`/etm/${pedidoId}`);
  revalidatePath(`/admin/etm/${pedidoId}`);
}

/** Comenta um momento do vídeo entregue; vale como ponto de correção. Só enquanto a versão está em avaliação. */
export async function comentarNoVideo(arquivoId: string, segundo: number, texto: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(arquivoId)) return { ok: false, erro: "Vídeo inválido." };
  const seg = Math.round(Number(segundo) * 10) / 10;
  if (!(seg >= 0 && seg <= 86400)) return { ok: false, erro: "Momento do vídeo inválido." };
  const msg = limpar(texto, 1000);
  if (msg.length < 1) return { ok: false, erro: "Escreva o comentário." };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const { data: arquivo } = await db.from("etm_arquivos").select("id,pedido_id,papel,nome,evento_id").eq("id", arquivoId).maybeSingle();
  if (!arquivo || arquivo.papel !== "entrega" || !ehVideo(String(arquivo.nome))) return { ok: false, erro: "Este arquivo não aceita comentários." };
  const { data: pedido } = await db.from("etm_pedidos").select("status").eq("id", arquivo.pedido_id).maybeSingle();
  if (pedido?.status !== "em_avaliacao") return { ok: false, erro: "Só dá para comentar enquanto a versão está em avaliação." };
  const { data: ultima } = await db
    .from("etm_eventos")
    .select("id")
    .eq("pedido_id", arquivo.pedido_id)
    .eq("tipo", "entrega")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultima || arquivo.evento_id !== ultima.id) return { ok: false, erro: "Só a versão mais recente aceita comentários." };

  const { error } = await db.from("etm_comentarios_video").insert({
    pedido_id: arquivo.pedido_id,
    arquivo_id: arquivoId,
    segundo: seg,
    texto: msg,
    autor_nome: user.nome,
    autor_id: user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível salvar o comentário." };
  atualizarTelasDoVideo(arquivo.pedido_id as string);
  return { ok: true };
}

export async function editarComentarioVideo(id: string, texto: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(id)) return { ok: false, erro: "Comentário inválido." };
  const msg = limpar(texto, 1000);
  if (msg.length < 1) return { ok: false, erro: "Escreva o comentário." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const pedidoId = await comentarioEditavel(db, id, user.id);
  if (!pedidoId) return { ok: false, erro: "Este comentário não pode mais ser editado." };
  await db.from("etm_comentarios_video").update({ texto: msg, editado_em: new Date().toISOString() }).eq("id", id);
  atualizarTelasDoVideo(pedidoId);
  return { ok: true };
}

export async function excluirComentarioVideo(id: string): Promise<Resultado> {
  const user = await getEtmUser();
  if (!user) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(id)) return { ok: false, erro: "Comentário inválido." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Serviço indisponível." };
  const pedidoId = await comentarioEditavel(db, id, user.id);
  if (!pedidoId) return { ok: false, erro: "Este comentário não pode mais ser excluído." };
  await db.from("etm_comentarios_video").delete().eq("id", id);
  atualizarTelasDoVideo(pedidoId);
  return { ok: true };
}
