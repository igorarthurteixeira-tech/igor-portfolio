import { supabaseAdmin } from "@/lib/supabase/admin";
import { series } from "@/lib/series";
import * as yt from "./youtube";

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

/** Título e texto da playlist de uma série (do código ou do painel). */
async function dadosDaSerie(db: Db, slug: string) {
  const doCodigo = series.find((s) => s.slug === slug);
  const doBanco = doCodigo
    ? null
    : (await db.from("series_painel").select("titulo,chamada").eq("slug", slug).maybeSingle()).data;
  const titulo = doCodigo?.titulo ?? (doBanco?.titulo as string | undefined) ?? slug;
  const chamada = doCodigo?.chamada ?? (doBanco?.chamada as string | undefined) ?? "";
  return {
    titulo,
    descricao: `${chamada ? `${chamada}\n\n` : ""}Série de ficção da Vida de Dono. Todos os episódios: https://igorarthurdev.com.br/vida-de-dono/${slug}`,
  };
}

/** Devolve a playlist da série, criando-a (e guardando o id) se ainda não existir. */
export async function garantirPlaylist(db: Db, acesso: string, slug: string) {
  const { data } = await db.from("serie_youtube").select("playlist_id").eq("slug", slug).maybeSingle();
  if (data?.playlist_id) return data.playlist_id as string;
  const { titulo, descricao } = await dadosDaSerie(db, slug);
  const id = await yt.criarPlaylist(acesso, titulo, descricao);
  const { error } = await db.from("serie_youtube").insert({ slug, playlist_id: id });
  if (error) throw new Error("A playlist foi criada, mas não foi possível guardá-la. A tabela serie_youtube existe?");
  return id;
}

/** Coloca o vídeo na playlist da série do episódio. */
export async function colocarNaPlaylist(db: Db, acesso: string, episodio: string, videoId: string) {
  const slug = episodio.split(":")[0];
  const playlist = await garantirPlaylist(db, acesso, slug);
  await yt.adicionarNaPlaylist(acesso, playlist, videoId);
}
