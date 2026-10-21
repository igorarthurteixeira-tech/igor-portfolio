import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";

const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

export async function POST(request: Request) {
  // testes locais e prévias não entram nas métricas reais
  if (process.env.VERCEL_ENV !== "production") return new Response(null, { status: 204 });
  if (!permitir(request, "eventos", 240, 60_000)) {
    return new Response(null, { status: 429 });
  }
  if (BOTS.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }
  const body = await request.json().catch(() => null);
  const tipo = body?.tipo;
  const caminho = String(body?.caminho ?? "").slice(0, 200);
  if ((tipo !== "view" && tipo !== "click") || !caminho.startsWith("/")) {
    return new Response(null, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return new Response(null, { status: 204 });

  await db.from("eventos").insert({
    tipo,
    caminho,
    alvo: body.alvo ? String(body.alvo).slice(0, 200) : null,
    sessao: body.sessao ? String(body.sessao).slice(0, 64) : null,
    referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
  });
  return new Response(null, { status: 204 });
}
