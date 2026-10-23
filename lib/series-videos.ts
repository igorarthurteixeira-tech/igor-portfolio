import { supabaseAdmin } from "@/lib/supabase/admin";
import { idEpisodio, series, type Serie } from "@/lib/series";

type Ligacao = { videoId?: string; agendadaEm: string | null; publicadoEm?: string };

/**
 * O painel de Publicações é a fonte da verdade da série: cada episódio é ligado a uma
 * publicação (campo "Episódio da série"). Dela saem o vídeo do YouTube e a data.
 */
async function ligacoesDoPainel(): Promise<Record<string, Ligacao>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data } = await db
    .from("publicacoes")
    .select("episodio,redes,status_redes,detalhes_redes,agendada_em,criado_em")
    .not("episodio", "is", null)
    .order("criado_em", { ascending: true });

  const mapa: Record<string, Ligacao> = {};
  for (const p of data ?? []) {
    const youtube = (p.detalhes_redes as { youtube?: { media_id?: string; publicado_em?: string } } | null)?.youtube;
    const publicado = (p.status_redes as { youtube?: string } | null)?.youtube === "publicado";
    mapa[p.episodio as string] = {
      agendadaEm: (p.agendada_em as string | null) ?? null,
      videoId: publicado ? youtube?.media_id : undefined,
      publicadoEm: publicado ? youtube?.publicado_em : undefined,
    };
  }
  return mapa;
}

/** Texto de agenda de cada série, editado no painel. */
export async function agendasDasSeries(): Promise<Record<string, string>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data } = await db.from("serie_config").select("slug,agenda");
  return Object.fromEntries((data ?? []).map((r) => [r.slug as string, r.agenda as string]));
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

/**
 * Séries como o site deve mostrar, segundo o painel. Só entram as séries que têm ao menos
 * um episódio ligado a uma publicação.
 */
export async function seriesDoPainel(): Promise<Serie[]> {
  const [mapa, agendas] = await Promise.all([ligacoesDoPainel(), agendasDasSeries()]);
  const resultado: Serie[] = [];
  for (const s of series) {
    let ligada = false;
    const episodios = await Promise.all(
      s.episodios.map(async (ep) => {
        const base = { ...ep, youtubeId: undefined, estreia: undefined, quando: undefined };
        const l = mapa[idEpisodio(s.slug, ep.numero)];
        if (!l) return base;
        ligada = true;
        if (l.videoId && (await estaPublico(l.videoId))) {
          return { ...base, youtubeId: l.videoId, quando: l.publicadoEm ?? l.agendadaEm ?? undefined };
        }
        return { ...base, estreia: l.agendadaEm ?? undefined, quando: l.agendadaEm ?? undefined };
      }),
    );
    if (ligada) resultado.push({ ...s, episodios, agenda: agendas[s.slug] });
  }
  return resultado;
}

export async function serieDoPainel(slug: string) {
  return (await seriesDoPainel()).find((s) => s.slug === slug);
}
