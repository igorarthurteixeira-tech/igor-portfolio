import { supabaseAdmin } from "@/lib/supabase/admin";
import { idEpisodio, idsValidos, series, type ChatSerie, type Episodio, type Serie } from "@/lib/series";

/** Dados do episódio quando a série foi criada pelo painel (as séries antigas ficam no código). */
export type EpMeta = { titulo: string; resumo: string; duracao: string; poster: string };

type Ligacao = { videoId?: string; agendadaEm: string | null; publicadoEm?: string; ep?: EpMeta };

type SerieDoBanco = {
  slug: string;
  titulo: string;
  chamada: string;
  descricao: string;
  capa: string | null;
  chat: ChatSerie | null;
  destaque: boolean;
};

/**
 * O painel de Publicações é a fonte da verdade da série: cada episódio é ligado a uma
 * publicação (campo "Série"). Dela saem o vídeo do YouTube, a data e, nas séries do painel,
 * os dados do episódio.
 */
async function ligacoesDoPainel(): Promise<Record<string, Ligacao>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data } = await db
    .from("publicacoes")
    .select("*")
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
      ep: (p.ep as EpMeta | null) ?? undefined,
    };
  }
  return mapa;
}

/** Séries criadas pelo painel. Se a tabela ainda não existe, o site segue só com as do código. */
export async function seriesDoBanco(): Promise<SerieDoBanco[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from("series_painel").select("*").order("criado_em", { ascending: true });
  if (error) return [];
  return (data ?? []) as SerieDoBanco[];
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

/** Texto de agenda de cada série, editado no painel. */
export async function agendasDasSeries(): Promise<Record<string, string>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data } = await db.from("serie_config").select("slug,agenda");
  return Object.fromEntries((data ?? []).map((r) => [r.slug as string, r.agenda as string]));
}

/** Aplica ao episódio o que o painel sabe: vídeo (se público) ou data prevista. */
async function resolverEpisodio(base: Episodio, l: Ligacao | undefined): Promise<Episodio> {
  const vazio = { ...base, youtubeId: undefined, estreia: undefined, quando: undefined };
  if (!l) return vazio;
  if (l.videoId && (await estaPublico(l.videoId))) {
    return { ...vazio, youtubeId: l.videoId, quando: l.publicadoEm ?? l.agendadaEm ?? undefined };
  }
  return { ...vazio, estreia: l.agendadaEm ?? undefined, quando: l.agendadaEm ?? undefined };
}

/** Episódios de uma série do painel: um por publicação ligada a ela. */
function episodiosDoBanco(slug: string, mapa: Record<string, Ligacao>): { base: Episodio; l: Ligacao }[] {
  return Object.entries(mapa)
    .filter(([id, l]) => id.startsWith(`${slug}:`) && l.ep)
    .map(([id, l]) => ({
      base: { numero: Number(id.split(":")[1]), ...(l.ep as EpMeta) } satisfies Episodio,
      l,
    }))
    .sort((a, b) => a.base.numero - b.base.numero);
}

/**
 * Séries como o site deve mostrar, segundo o painel. Só entram as que têm ao menos um episódio
 * ligado a uma publicação.
 */
export async function seriesDoPainel(): Promise<Serie[]> {
  const [mapa, agendas, doBanco] = await Promise.all([ligacoesDoPainel(), agendasDasSeries(), seriesDoBanco()]);
  const resultado: Serie[] = [];

  for (const s of series) {
    if (!s.episodios.some((ep) => mapa[idEpisodio(s.slug, ep.numero)])) continue;
    const episodios = await Promise.all(s.episodios.map((ep) => resolverEpisodio(ep, mapa[idEpisodio(s.slug, ep.numero)])));
    resultado.push({ ...s, episodios, agenda: agendas[s.slug] });
  }

  for (const d of doBanco) {
    const itens = episodiosDoBanco(d.slug, mapa);
    if (itens.length === 0) continue;
    const episodios = await Promise.all(itens.map((i) => resolverEpisodio(i.base, i.l)));
    resultado.push({
      slug: d.slug,
      titulo: d.titulo,
      chamada: d.chamada,
      descricao: d.descricao,
      capa: d.capa ?? episodios[0].poster,
      destaque: d.destaque,
      chat: d.chat ?? undefined,
      agenda: agendas[d.slug],
      episodios,
    });
  }
  return resultado;
}

export async function serieDoPainel(slug: string) {
  return (await seriesDoPainel()).find((s) => s.slug === slug);
}

export type ItemCatalogo = {
  slug: string;
  titulo: string;
  /** "codigo": episódios fixos; "painel": numeração livre. */
  origem: "codigo" | "painel";
  episodios: { numero: number; titulo: string }[];
};

/** Todas as séries que o painel conhece (do código e do banco), para o formulário e a lista. */
export async function catalogoDeSeries(): Promise<ItemCatalogo[]> {
  const [mapa, doBanco] = await Promise.all([ligacoesDoPainel(), seriesDoBanco()]);
  const doCodigo: ItemCatalogo[] = series.map((s) => ({
    slug: s.slug,
    titulo: s.titulo,
    origem: "codigo",
    episodios: s.episodios.map((e) => ({ numero: e.numero, titulo: e.titulo })),
  }));
  const doPainel: ItemCatalogo[] = doBanco.map((d) => ({
    slug: d.slug,
    titulo: d.titulo,
    origem: "painel",
    episodios: episodiosDoBanco(d.slug, mapa).map((i) => ({ numero: i.base.numero, titulo: i.base.titulo })),
  }));
  return [...doCodigo, ...doPainel];
}

/** Ids de episódio aceitos para curtidas e comentários: os do código e os das publicações do painel. */
export async function idsValidosDinamicos(): Promise<Set<string>> {
  const ids = idsValidos();
  const db = supabaseAdmin();
  if (!db) return ids;
  const { data } = await db.from("publicacoes").select("episodio").not("episodio", "is", null);
  for (const p of data ?? []) ids.add(p.episodio as string);
  return ids;
}
