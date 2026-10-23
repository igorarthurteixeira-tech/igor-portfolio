import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";
import { MIN_CURTIDAS_EXIBIDAS } from "@/lib/series";
import { idsValidosDinamicos } from "@/lib/series-videos";

/** Curte ou descurte (alterna) um episódio. Uma curtida por pessoa (identificada por um ID guardado no navegador). */
export async function POST(request: Request) {
  if (!permitir(request, "serie-curtir", 40, 10 * 60_000)) {
    return Response.json({ erro: "Muitas curtidas em pouco tempo." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const episodio = String(body?.episodio ?? "");
  const sessao = String(body?.sessao ?? "").slice(0, 64);
  if (!(await idsValidosDinamicos()).has(episodio) || sessao.length < 8) {
    return Response.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return Response.json({ erro: "Indisponível no momento." }, { status: 503 });

  const { data: ja } = await db
    .from("serie_curtidas")
    .select("id")
    .eq("episodio", episodio)
    .eq("sessao", sessao)
    .maybeSingle();

  let curtiu: boolean;
  if (ja) {
    await db.from("serie_curtidas").delete().eq("id", ja.id);
    curtiu = false;
  } else {
    const { error } = await db.from("serie_curtidas").insert({ episodio, sessao });
    if (error) return Response.json({ erro: "Não foi possível curtir." }, { status: 500 });
    curtiu = true;
  }

  const { count } = await db
    .from("serie_curtidas")
    .select("id", { count: "exact", head: true })
    .eq("episodio", episodio);
  const n = count ?? 0;
  return Response.json({ curtiu, curtidas: n >= MIN_CURTIDAS_EXIBIDAS ? n : null });
}
