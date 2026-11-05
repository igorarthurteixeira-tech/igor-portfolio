"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apagarPastaPedido, limparCacheDrive } from "@/lib/drive";
import { BUCKET_ETM, STATUS, type ArquivoEnviado, type StatusPedido } from "@/lib/etm";
import {
  atualizarPedido,
  criarEvento,
  ehUuid,
  garantirTipo,
  limpar,
  linkValido,
  prepararUpload,
  registrarArquivos,
  validarArquivos,
  type Resultado,
} from "@/lib/etm-servidor";

const NOME_ADMIN = "Igor";

function atualizarTelas(pedidoId?: string) {
  revalidatePath("/admin/etm");
  if (pedidoId) {
    revalidatePath(`/admin/etm/${pedidoId}`);
    revalidatePath(`/etm/${pedidoId}`);
  }
  revalidatePath("/etm");
  revalidatePath("/admin", "layout");
}

export async function criarUploadUrlAdminEtm(pedidoId: string, nome: string, tamanho: number) {
  if (!(await getAdminUser())) return { ok: false as const, erro: "Sem permissão." };
  return prepararUpload(pedidoId, nome, tamanho);
}

/** Posta uma versão do vídeo (arquivo e/ou link) e passa o pedido para "aguardando avaliação". */
export async function entregarVersao(
  pedidoId: string,
  texto: string,
  link: string,
  arquivos: ArquivoEnviado[],
): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId)) return { ok: false, erro: "Pedido inválido." };
  const anexos = await validarArquivos(pedidoId, arquivos);
  if (typeof anexos === "string") return { ok: false, erro: anexos };
  const url = linkValido(link);
  if (url === null) return { ok: false, erro: "O link precisa começar com http:// ou https://." };
  if (anexos.length === 0 && !url) return { ok: false, erro: "Anexe o vídeo ou cole um link." };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  // a entrega é a passagem de "em produção" para a avaliação: antes disso, só o aviso de que a produção começou
  const { data: pedido } = await db.from("etm_pedidos").select("status").eq("id", pedidoId).maybeSingle();
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status !== "em_producao") {
    return { ok: false, erro: "Inicie a produção antes de entregar uma versão." };
  }
  const { count } = await db
    .from("etm_eventos")
    .select("*", { count: "exact", head: true })
    .eq("pedido_id", pedidoId)
    .eq("tipo", "entrega");

  const eventoId = await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "igor",
    autor_nome: NOME_ADMIN,
    tipo: "entrega",
    texto: limpar(texto, 4000),
    status_novo: "em_avaliacao",
    versao: (count ?? 0) + 1,
    link: url,
  });
  await registrarArquivos(db, pedidoId, eventoId, "entrega", anexos);
  await atualizarPedido(db, pedidoId, { status: "em_avaliacao" });
  atualizarTelas(pedidoId);
  return { ok: true };
}

export async function comentarComoIgor(pedidoId: string, texto: string, arquivos: ArquivoEnviado[]): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId)) return { ok: false, erro: "Pedido inválido." };
  const msg = limpar(texto, 4000);
  const anexos = await validarArquivos(pedidoId, arquivos);
  if (typeof anexos === "string") return { ok: false, erro: anexos };
  if (!msg && anexos.length === 0) return { ok: false, erro: "Escreva uma mensagem ou anexe um arquivo." };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const eventoId = await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "igor",
    autor_nome: NOME_ADMIN,
    tipo: "comentario",
    texto: msg,
  });
  await registrarArquivos(db, pedidoId, eventoId, "anexo", anexos);
  await atualizarPedido(db, pedidoId);
  atualizarTelas(pedidoId);
  return { ok: true };
}

/** Muda o status à mão (iniciar produção, marcar como enviado, cancelar...). */
export async function mudarStatus(
  pedidoId: string,
  status: StatusPedido,
  texto: string,
  link: string,
): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId) || !(status in STATUS)) return { ok: false, erro: "Dados inválidos." };
  const url = linkValido(link);
  if (url === null) return { ok: false, erro: "O link precisa começar com http:// ou https://." };

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await criarEvento(db, {
    pedido_id: pedidoId,
    autor: "igor",
    autor_nome: NOME_ADMIN,
    tipo: "status",
    texto: limpar(texto, 4000),
    status_novo: status,
    link: url,
  });
  await atualizarPedido(db, pedidoId, { status });
  atualizarTelas(pedidoId);
  return { ok: true };
}

export async function excluirPedido(pedidoId: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(pedidoId)) return { ok: false, erro: "Pedido inválido." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { data } = await db.from("etm_arquivos").select("caminho").eq("pedido_id", pedidoId);
  const todos = (data ?? []).map((a) => a.caminho as string);
  const caminhos = todos.filter((c) => !c.startsWith("drive:"));
  if (caminhos.length) await db.storage.from(BUCKET_ETM).remove(caminhos);
  // arquivos do Drive ficam numa pasta própria do pedido: apagar a pasta leva tudo junto
  if (todos.some((c) => c.startsWith("drive:"))) await apagarPastaPedido(db, pedidoId);
  await db.from("etm_pedidos").delete().eq("id", pedidoId);
  atualizarTelas();
  return { ok: true };
}

// ---- contas da ETM ----

export async function definirSituacaoEtm(userId: string, situacao: "aprovado" | "bloqueado"): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(userId) || (situacao !== "aprovado" && situacao !== "bloqueado")) return { ok: false, erro: "Dados inválidos." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await db.from("etm_usuarios").update({ situacao }).eq("user_id", userId);
  atualizarTelas();
  return { ok: true };
}

/** Remove o cadastro por completo (recusa de um pedido de acesso). */
export async function recusarUsuarioEtm(userId: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(userId)) return { ok: false, erro: "Usuário inválido." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  // só contas da ETM: nunca a do painel
  const { data } = await db.from("etm_usuarios").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) return { ok: false, erro: "Pessoa não encontrada." };
  await db.auth.admin.deleteUser(userId);
  atualizarTelas();
  return { ok: true };
}

export async function redefinirSenhaEtm(userId: string, senha: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!ehUuid(userId)) return { ok: false, erro: "Usuário inválido." };
  if (senha.length < 8) return { ok: false, erro: "A senha precisa de pelo menos 8 caracteres." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  // só contas da ETM: nunca a do painel
  const { data } = await db.from("etm_usuarios").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) return { ok: false, erro: "Pessoa não encontrada." };
  const { error } = await db.auth.admin.updateUserById(userId, { password: senha });
  if (error) return { ok: false, erro: "Não foi possível trocar a senha." };
  return { ok: true };
}

// ---- tipos de pedido ----

export async function adicionarTipoEtm(nome: string, descricao: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const tipo = await garantirTipo(db, nome, descricao);
  if (!tipo) return { ok: false, erro: "Informe um nome de 2 a 40 letras." };
  // tipo que já existia oculto volta a aparecer: foi pedido de propósito
  await db.from("etm_tipos").update({ ativo: true }).eq("rotulo", tipo);
  atualizarTelas();
  return { ok: true };
}

export async function editarDescricaoTipoEtm(rotulo: string, descricao: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await db.from("etm_tipos").update({ descricao: limpar(descricao, 200) }).eq("rotulo", limpar(rotulo, 40));
  atualizarTelas();
  return { ok: true };
}

export async function alternarTipoEtm(rotulo: string, ativo: boolean): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await db.from("etm_tipos").update({ ativo }).eq("rotulo", limpar(rotulo, 40));
  atualizarTelas();
  return { ok: true };
}

// ---- Google Drive ----

/** Desconecta o Drive. Os arquivos continuam na conta do Google, mas o site deixa de conseguir abri-los até reconectar. */
export async function desconectarDriveEtm(): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await db.from("redes_conexoes").delete().in("rede", ["drive", "drive_pasta"]);
  limparCacheDrive();
  atualizarTelas();
  return { ok: true };
}
