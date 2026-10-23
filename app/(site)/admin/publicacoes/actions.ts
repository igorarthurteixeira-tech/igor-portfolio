"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import * as ig from "@/lib/redes/instagram";
import { executarRede } from "@/lib/redes/executar";
import { colocarNaPlaylist } from "@/lib/redes/playlists";
import * as yt from "@/lib/redes/youtube";
import { series } from "@/lib/series";
import type { EpMeta } from "@/lib/series-videos";
import {
  BUCKET,
  BUCKET_SERIES,
  LIMITE_ARQUIVO,
  idsRedes,
  localParaIso,
  type RedeId,
  type SerieEnviada,
  type StatusRede,
  type Textos,
} from "@/lib/publicacoes";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const limpar = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

/** "Salão Reservado!" -> "salao-reservado" */
const slugificar = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

/** Copia a capa (bucket privado) para o bucket público das séries e devolve o endereço público. */
async function copiarCapaParaPublico(db: Db, capaPath: string, base: string) {
  const { data, error } = await db.storage.from(BUCKET).download(capaPath);
  if (error || !data) throw new Error("Não foi possível ler a capa enviada.");
  const ext = (capaPath.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const destino = `${base}-${randomUUID().slice(0, 8)}.${ext}`;
  const { error: erroUp } = await db.storage
    .from(BUCKET_SERIES)
    .upload(destino, data, { contentType: data.type || "image/jpeg", upsert: false });
  if (erroUp) throw new Error("Não foi possível publicar a capa da série. O bucket \"series\" existe?");
  return db.storage.from(BUCKET_SERIES).getPublicUrl(destino).data.publicUrl;
}

/** Caminho dentro do bucket público a partir do endereço público, para apagar o arquivo. */
const caminhoPublico = (url: string) => url.split(`/object/public/${BUCKET_SERIES}/`)[1] ?? null;

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
  serie: SerieEnviada | null;
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

  // ---- série (opcional)
  let episodio: string | null = null;
  let ep: EpMeta | null = null;
  let serieNova: { slug: string; titulo: string; chamada: string; descricao: string; capa: string } | null = null;
  let posterCriado: string | null = null;

  if (dados.serie) {
    const sr = dados.serie;
    const numero = Math.floor(Number(sr.numero));
    if (!Number.isFinite(numero) || numero < 1 || numero > 999) return { ok: false, erro: "Informe o número do episódio." };

    const criando = sr.escolha === "nova";
    const nome = limpar(sr.nome, 60);
    let slug = sr.escolha;
    if (criando) {
      if (nome.length < 2) return { ok: false, erro: "Dê um nome à nova série." };
      slug = slugificar(nome);
      if (!slug) return { ok: false, erro: "O nome da série precisa ter letras ou números." };
      const { data: igual } = await db.from("series_painel").select("slug").eq("slug", slug).maybeSingle();
      if (igual || series.some((x) => x.slug === slug)) return { ok: false, erro: "Já existe uma série com esse nome." };
    }

    const doCodigo = series.find((x) => x.slug === slug);
    if (!criando && !doCodigo) {
      const { data: existe, error: erroSerie } = await db.from("series_painel").select("slug").eq("slug", slug).maybeSingle();
      if (erroSerie || !existe) return { ok: false, erro: "Série não encontrada." };
    }
    if (doCodigo && !doCodigo.episodios.some((e) => e.numero === numero)) {
      return { ok: false, erro: "Esse episódio não existe nessa série." };
    }

    episodio = `${slug}:${numero}`;
    const { data: repetido } = await db.from("publicacoes").select("id").eq("episodio", episodio).limit(1);
    if (repetido && repetido.length > 0) return { ok: false, erro: "Esse episódio da série já tem uma publicação." };

    if (!doCodigo) {
      const epTitulo = limpar(sr.epTitulo, 120);
      if (epTitulo.length < 2) return { ok: false, erro: "Dê um título ao episódio." };
      if (!dados.capaPath) return { ok: false, erro: "Envie a capa: ela vira a imagem do episódio no site." };
      try {
        posterCriado = await copiarCapaParaPublico(db, dados.capaPath, `${slug}/ep${numero}`);
      } catch (e) {
        return { ok: false, erro: e instanceof Error ? e.message : "Falha ao preparar a capa." };
      }
      ep = { titulo: epTitulo, resumo: limpar(sr.resumo, 300), duracao: limpar(sr.duracao, 8), poster: posterCriado };
      if (criando) {
        serieNova = {
          slug,
          titulo: nome,
          chamada: limpar(sr.chamada, 120),
          descricao: limpar(sr.descricao, 600),
          capa: posterCriado,
        };
      }
    }
  }

  if (serieNova) {
    const { error: erroNova } = await db.from("series_painel").insert(serieNova);
    if (erroNova) {
      if (posterCriado) await limparPoster(db, posterCriado);
      return { ok: false, erro: "Não foi possível criar a série. A tabela series_painel existe?" };
    }
  }

  const { error } = await db.from("publicacoes").insert({
    titulo,
    redes,
    textos,
    status_redes,
    agendada_em: dados.agendadaEm,
    video_path: dados.videoPath,
    capa_path: dados.capaPath,
    episodio,
    ep,
  });
  if (error) {
    if (serieNova) await db.from("series_painel").delete().eq("slug", serieNova.slug);
    if (posterCriado) await limparPoster(db, posterCriado);
    return { ok: false, erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  if (episodio) revalidatePath(`/vida-de-dono/${episodio.split(":")[0]}`);
  return { ok: true };
}

async function limparPoster(db: Db, url: string) {
  const caminho = caminhoPublico(url);
  if (caminho) await db.storage.from(BUCKET_SERIES).remove([caminho]);
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
  const { data } = await db.from("publicacoes").select("video_path,capa_path,episodio,ep").eq("id", id).single();
  const arquivos = [data?.video_path, data?.capa_path].filter(Boolean) as string[];
  if (arquivos.length) await db.storage.from(BUCKET).remove(arquivos);
  await db.from("publicacoes").delete().eq("id", id);

  const poster = (data?.ep as EpMeta | null)?.poster;
  if (poster) await limparPoster(db, poster);
  const slug = (data?.episodio as string | null)?.split(":")[0];
  if (slug && !series.some((x) => x.slug === slug)) {
    const { count } = await db
      .from("publicacoes")
      .select("*", { count: "exact", head: true })
      .like("episodio", `${slug}:%`);
    if ((count ?? 0) === 0) {
      const { data: linha } = await db.from("series_painel").select("capa").eq("slug", slug).maybeSingle();
      await db.from("series_painel").delete().eq("slug", slug);
      await db.from("serie_config").delete().eq("slug", slug);
      if (linha?.capa) await limparPoster(db, linha.capa as string);
    }
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  if (slug) revalidatePath(`/vida-de-dono/${slug}`);
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
  if (rede !== "instagram" && rede !== "linkedin") return { ok: false, erro: "Rede inválida." };
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
  const limpo = limpar(texto, 80);
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };
  if (!series.some((s) => s.slug === slug)) {
    const { data: existe } = await db.from("series_painel").select("slug").eq("slug", slug).maybeSingle();
    if (!existe) return { ok: false, erro: "Série inválida." };
  }

  const { error } = limpo
    ? await db.from("serie_config").upsert({ slug, agenda: limpo, atualizado_em: new Date().toISOString() })
    : await db.from("serie_config").delete().eq("slug", slug);
  if (error) return { ok: false, erro: "Não foi possível salvar. A tabela serie_config existe?" };

  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath(`/vida-de-dono/${slug}`);
  return { ok: true };
}

/** Cria as playlists das séries e coloca nelas os vídeos já publicados no YouTube (só os que ainda não estão). */
export async function organizarPlaylists(): Promise<Resultado<{ mensagem: string }>> {
  if (!(await getAdminUser())) return { ok: false, erro: "Sem permissão." };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };

  const { data: con } = await db.from("redes_conexoes").select("token").eq("rede", "youtube").maybeSingle();
  if (!con) return { ok: false, erro: "O YouTube não está conectado." };
  let acesso: string;
  try {
    acesso = await yt.tokenDeAcesso(con.token as string);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao acessar o YouTube." };
  }

  const { data } = await db
    .from("publicacoes")
    .select("id,episodio,status_redes,detalhes_redes")
    .not("episodio", "is", null);
  const pendentes = (data ?? [])
    .filter((p) => {
      const d = (p.detalhes_redes as { youtube?: { media_id?: string; na_playlist?: boolean } } | null)?.youtube;
      return (p.status_redes as { youtube?: string } | null)?.youtube === "publicado" && !!d?.media_id && !d.na_playlist;
    })
    .sort((a, b) => String(a.episodio).localeCompare(String(b.episodio), "pt-BR", { numeric: true }));

  let feitos = 0;
  const erros: string[] = [];
  for (const p of pendentes) {
    const detalhes = p.detalhes_redes as Record<string, Record<string, unknown>>;
    try {
      await colocarNaPlaylist(db, acesso, p.episodio as string, detalhes.youtube.media_id as string);
      await db
        .from("publicacoes")
        .update({ detalhes_redes: { ...detalhes, youtube: { ...detalhes.youtube, na_playlist: true } } })
        .eq("id", p.id);
      feitos++;
    } catch (e) {
      erros.push(`${p.episodio}: ${e instanceof Error ? e.message : "erro"}`);
      break; // o mesmo problema (permissão) se repetiria nos próximos
    }
  }
  revalidatePath("/admin", "layout");
  if (erros.length) {
    return { ok: false, erro: `${feitos} organizado(s). ${erros[0]}. Se for permissão, use "Reconectar com o Google".` };
  }
  return {
    ok: true,
    mensagem: pendentes.length === 0 ? "Nada a organizar: todos os vídeos já estão nas playlists." : `${feitos} vídeo(s) colocado(s) nas playlists das séries.`,
  };
}
