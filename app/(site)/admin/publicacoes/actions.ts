"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BUCKET,
  LIMITE_ARQUIVO,
  idsRedes,
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
