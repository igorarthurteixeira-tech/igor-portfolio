"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import * as ig from "@/lib/redes/instagram";
import { executarRede } from "@/lib/redes/executar";
import { idsValidos, series } from "@/lib/series";
import {
  BUCKET,
  LIMITE_ARQUIVO,
  idsRedes,
  localParaIso,
  type RedeId,
  type StatusRede,
  type Textos,
} from "@/lib/publicacoes";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const limpar = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

/** Cria um endereço de envio direto do navegador para o Storage (evita o limite de tamanho do servidor). */
export async function criarUploadUrl(
  nome: string,
  tipo: "video" | "capa",
  tamanho: number,
): Promise<Resultado<{ path: string; token: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (tamanho > LIMITE_ARQUIVO) return { ok: false, erro: "Arquivo acima de 50 MB." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const ext = (nome.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${tipo}/${new Date().getFullYear()}/${randomUUID()}.${ext || "bin"}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio." };
  return { ok: true, path, token: data.token };
}

export async function salvarPublicacao(dados: {
  titulo: string;
  redes: string[];
  textos: Textos;
  agendadaEm: string | null;
  videoPath: string | null;
  capaPath: string | null;
  episodio: string | null;
}): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const titulo = limpar(dados.titulo, 120);
  if (titulo.length < 2) return { ok: false, erro: "Dê um título à publicação." };
  const redes = [...new Set(dados.redes.filter((r) => idsRedes.has(r)))] as RedeId[];
  if (redes.length === 0) return { ok: false, erro: "Escolha ao menos uma rede." };

  const textos: Textos = {};
  for (const r of redes) {
    const t = dados.textos?.[r];
    textos[r] = { titulo: limpar(t?.titulo, 120), legenda: limpar(t?.legenda, 5000) };
  }
  const status_redes: Record<string, StatusRede> = {};
  for (const r of redes) status_redes[r] = "pendente";

  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { error } = await db.from("publicacoes").insert({
    titulo,
    redes,
    textos,
    status_redes,
    agendada_em: dados.agendadaEm,
    video_path: dados.videoPath,
    capa_path: dados.capaPath,
    episodio: dados.episodio && idsValidos().has(dados.episodio) ? dados.episodio : null,
  });
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/admin/publicacoes");
  return { ok: true };
}

export async function marcarRede(id: string, rede: string, status: StatusRede): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!idsRedes.has(rede) || !["pendente", "publicado", "erro"].includes(status)) {
    return { ok: false, erro: "Dados inválidos." };
  }
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { data } = await db.from("publicacoes").select("status_redes").eq("id", id).single();
  if (!data) return { ok: false, erro: "Publicação não encontrada." };
  const novo = { ...(data.status_redes as object), [rede]: status };
  await db.from("publicacoes").update({ status_redes: novo }).eq("id", id);
  revalidatePath("/admin/publicacoes");
  return { ok: true };
}

export async function excluirPublicacao(id: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { data } = await db.from("publicacoes").select("video_path,capa_path").eq("id", id).single();
  const arquivos = [data?.video_path, data?.capa_path].filter(Boolean) as string[];
  if (arquivos.length) await db.storage.from(BUCKET).remove(arquivos);
  await db.from("publicacoes").delete().eq("id", id);
  revalidatePath("/admin/publicacoes");
  return { ok: true };
}

/** Apaga só o vídeo do Storage (já publicado), mantendo o registro. */
export async function apagarVideo(id: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { data } = await db.from("publicacoes").select("video_path").eq("id", id).single();
  if (data?.video_path) await db.storage.from(BUCKET).remove([data.video_path]);
  await db.from("publicacoes").update({ video_path: null }).eq("id", id);
  revalidatePath("/admin/publicacoes");
  return { ok: true };
}

/** Link temporário (1 hora) para abrir ou baixar um arquivo. */
export async function linkDoArquivo(path: string): Promise<Resultado<{ url: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return { ok: false, erro: "Arquivo não encontrado." };
  return { ok: true, url: data.signedUrl };
}

/** Guarda o token do Instagram (só no servidor) depois de conferir que ele funciona. */
export async function conectarInstagram(token: string): Promise<Resultado<{ conta: string; expiraEm: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const limpo = String(token ?? "").trim();
  if (limpo.length < 40) return { ok: false, erro: "Esse texto não parece um token do Instagram." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };

  let conta;
  try {
    conta = await ig.validarToken(limpo);
  } catch (e) {
    return { ok: false, erro: `O Instagram recusou o token: ${e instanceof Error ? e.message : "erro"}` };
  }

  let tokenFinal = limpo;
  let expiraEm = new Date(Date.now() + 59 * 86400000).toISOString();
  try {
    const novo = await ig.renovarToken(limpo);
    tokenFinal = novo.token;
    expiraEm = novo.expiraEm;
  } catch {
    // token recém-gerado (menos de 24 h): assume 60 dias, e a renovação acontece depois
  }

  const { error } = await db.from("redes_conexoes").upsert({
    rede: "instagram",
    conta_id: conta.contaId,
    conta_nome: conta.usuario,
    token: tokenFinal,
    expira_em: expiraEm,
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false, erro: "Não foi possível guardar a conexão. A tabela redes_conexoes existe?" };
  revalidatePath("/admin/publicacoes");
  return { ok: true, conta: conta.usuario, expiraEm };
}

export async function desconectarRede(rede: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!idsRedes.has(rede)) return { ok: false, erro: "Rede inválida." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  await db.from("redes_conexoes").delete().eq("rede", rede);
  revalidatePath("/admin/publicacoes");
  return { ok: true };
}

/** Publica agora numa rede (Instagram por enquanto). Pode levar até cerca de 50 segundos. */
export async function publicarAgora(id: string, rede: string): Promise<Resultado<{ mensagem: string; estado: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!idsRedes.has(rede)) return { ok: false, erro: "Rede inválida." };
  const r = await executarRede(id, rede as RedeId, 45_000);
  revalidatePath("/admin/publicacoes");
  return { ok: true, mensagem: r.mensagem, estado: r.estado };
}

/** Consulta rápida (sem esperar muito) para um vídeo que o Instagram ainda está processando. */
export async function verificarRede(id: string, rede: string): Promise<Resultado<{ mensagem: string; estado: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (rede !== "instagram") return { ok: false, erro: "Rede inválida." };
  const r = await executarRede(id, rede as RedeId, 8_000);
  revalidatePath("/admin/publicacoes");
  return { ok: true, mensagem: r.mensagem, estado: r.estado };
}

/** Muda (ou remove) a data de agendamento. O site e o agendador passam a usar a nova data. */
export async function alterarData(
  id: string,
  valor: string | null,
): Promise<Resultado<{ passada: boolean; mensagem: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const iso = valor ? localParaIso(valor) : null;
  if (valor && !iso) return { ok: false, erro: "Data inválida." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };

  const { data } = await db.from("publicacoes").select("status_redes,episodio").eq("id", id).single();
  if (!data) return { ok: false, erro: "Publicação não encontrada." };
  if (Object.values((data.status_redes ?? {}) as Record<string, string>).includes("processando")) {
    return { ok: false, erro: "Há um envio em andamento. Espere terminar para mudar a data." };
  }

  const { error } = await db.from("publicacoes").update({ agendada_em: iso }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível salvar a data." };

  revalidatePath("/admin", "layout");
  revalidatePath("/");
  const slug = (data.episodio as string | null)?.split(":")[0];
  if (slug) revalidatePath(`/vida-de-dono/${slug}`);

  if (!iso) return { ok: true, passada: false, mensagem: "Data removida. Esta publicação só sai com Publicar agora." };
  const passada = Date.parse(iso) <= Date.now();
  return {
    ok: true,
    passada,
    mensagem: passada
      ? "Data salva. Como já passou, o agendador publica em até 5 minutos."
      : "Data atualizada.",
  };
}

/** Texto de agenda da série exibido no site (vazio remove). */
export async function salvarAgendaSerie(slug: string, texto: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  if (!series.some((s) => s.slug === slug)) return { ok: false, erro: "Série inválida." };
  const limpo = limpar(texto, 80);
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };

  const { error } = limpo
    ? await db.from("serie_config").upsert({ slug, agenda: limpo, atualizado_em: new Date().toISOString() })
    : await db.from("serie_config").delete().eq("slug", slug);
  if (error) return { ok: false, erro: "Não foi possível salvar. A tabela serie_config existe?" };

  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath(`/vida-de-dono/${slug}`);
  return { ok: true };
}
