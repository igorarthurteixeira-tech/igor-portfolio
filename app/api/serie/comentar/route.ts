import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";
import { idsValidosDinamicos } from "@/lib/series-videos";

/** Recebe um comentário. Ele só aparece no site depois de aprovado no painel. */
export async function POST(request: Request) {
  if (!permitir(request, "serie-comentar", 4, 10 * 60_000)) {
    return Response.json(
      { erro: "Muitos comentários em pouco tempo. Tente de novo em alguns minutos." },
      { status: 429 },
    );
  }
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ erro: "Requisição inválida." }, { status: 400 });

  // Campo-isca: bots preenchem, pessoas não veem.
  if (body.site) return Response.json({ ok: true });

  const episodio = String(body.episodio ?? "");
  const nome = String(body.nome ?? "").trim().slice(0, 60);
  const texto = String(body.texto ?? "").trim().slice(0, 500);

  if (!(await idsValidosDinamicos()).has(episodio) || nome.length < 2 || texto.length < 3) {
    return Response.json(
      { erro: "Informe seu nome e um comentário com pelo menos 3 caracteres." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  if (!db) return Response.json({ erro: "Indisponível no momento." }, { status: 503 });

  const { error } = await db
    .from("serie_comentarios")
    .insert({ episodio, nome, texto, aprovado: false });
  if (error) return Response.json({ erro: "Não foi possível enviar." }, { status: 500 });

  return Response.json({ ok: true });
}
