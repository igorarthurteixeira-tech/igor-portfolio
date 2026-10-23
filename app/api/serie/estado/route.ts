import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";
import {
  MIN_COMENTARIOS_EXIBIDOS,
  MIN_CURTIDAS_EXIBIDAS,
} from "@/lib/series";
import { idsValidosDinamicos } from "@/lib/series-videos";

export const dynamic = "force-dynamic";

/** Estado público de um episódio: números (só acima do mínimo), comentários aprovados e se esta pessoa já curtiu. */
export async function GET(request: Request) {
  if (!permitir(request, "serie-estado", 120, 60_000)) {
    return Response.json({ erro: "Muitas requisições." }, { status: 429 });
  }
  const url = new URL(request.url);
  const episodio = url.searchParams.get("episodio") ?? "";
  const sessao = (url.searchParams.get("sessao") ?? "").slice(0, 64);
  if (!(await idsValidosDinamicos()).has(episodio)) {
    return Response.json({ erro: "Episódio inválido." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const vazio = { curtidas: null, comentarios: null, jaCurtiu: false, lista: [] };
  if (!db) return Response.json(vazio);

  const [curtidas, comentarios, minha] = await Promise.all([
    db
      .from("serie_curtidas")
      .select("id", { count: "exact", head: true })
      .eq("episodio", episodio),
    db
      .from("serie_comentarios")
      .select("id,nome,texto,created_at", { count: "exact" })
      .eq("episodio", episodio)
      .eq("aprovado", true)
      .order("created_at", { ascending: false })
      .limit(30),
    sessao
      ? db
          .from("serie_curtidas")
          .select("id", { count: "exact", head: true })
          .eq("episodio", episodio)
          .eq("sessao", sessao)
      : Promise.resolve({ count: 0 }),
  ]);

  const nCurtidas = curtidas.count ?? 0;
  const nComentarios = comentarios.count ?? 0;
  return Response.json({
    curtidas: nCurtidas >= MIN_CURTIDAS_EXIBIDAS ? nCurtidas : null,
    comentarios: nComentarios >= MIN_COMENTARIOS_EXIBIDOS ? nComentarios : null,
    jaCurtiu: (minha.count ?? 0) > 0,
    lista: comentarios.data ?? [],
  });
}
