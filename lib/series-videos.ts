import { supabaseAdmin } from "@/lib/supabase/admin";
import { idEpisodio, type Serie } from "@/lib/series";

/**
 * Vídeos do YouTube enviados pelo painel de Publicações e ligados a um episódio.
 * O ID vem do banco; assim o site passa a mostrar o episódio sem precisar editar o código.
 */
async function videosDoPainel(): Promise<Record<string, string>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data } = await db
    .from("publicacoes")
    .select("episodio,status_redes,detalhes_redes,criado_em")
    .not("episodio", "is", null)
    .order("criado_em", { ascending: true });

  const mapa: Record<string, string> = {};
  for (const p of data ?? []) {
    const id = (p.detalhes_redes as { youtube?: { media_id?: string } } | null)?.youtube?.media_id;
    const status = (p.status_redes as { youtube?: string } | null)?.youtube;
    if (p.episodio && id && status === "publicado") mapa[p.episodio as string] = id;
  }
  return mapa;
}

/** Vídeo privado ou apagado não pode ser exibido: o oEmbed só responde 200 para vídeo visível. */
async function estaPublico(videoId: string) {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { next: { revalidate: 300 } },
    );
    return r.ok;
  } catch {
    return false;
  }
}

/** Devolve a série com o `youtubeId` de cada episódio vindo do painel (quando já está público). */
export async function serieComVideos(serie: Serie): Promise<Serie> {
  const mapa = await videosDoPainel();
  const episodios = await Promise.all(
    serie.episodios.map(async (ep) => {
      const doPainel = mapa[idEpisodio(serie.slug, ep.numero)];
      if (doPainel && (await estaPublico(doPainel))) return { ...ep, youtubeId: doPainel };
      return ep;
    }),
  );
  return { ...serie, episodios };
}
