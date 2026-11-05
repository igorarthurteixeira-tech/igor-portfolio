import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";

const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;
// painel e pedidos da ETM não são o portfólio
const PRIVADAS = /^\/(admin|etm)(\/|$)/;

/** "Chrome · Windows · computador": o suficiente para julgar se a visita parece real, sem identificar ninguém. */
function resumirAparelho(ua: string) {
  const app = /FBAN|FBAV/i.test(ua) ? "Facebook (app)" : /Instagram/i.test(ua) ? "Instagram (app)" : null;
  const navegador =
    app ??
    (/Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Outro");
  const sistema = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Outro";
  const tipo = /iPad|Tablet/.test(ua) ? "tablet" : /Mobi|iPhone|Android/.test(ua) ? "celular" : "computador";
  return `${navegador} · ${sistema} · ${tipo}`;
}

export async function POST(request: Request) {
  // testes locais e prévias não entram nas métricas reais
  if (process.env.VERCEL_ENV !== "production") return new Response(null, { status: 204 });
  if (!permitir(request, "eventos", 240, 60_000)) {
    return new Response(null, { status: 429 });
  }
  const ua = request.headers.get("user-agent") ?? "";
  if (BOTS.test(ua)) {
    return new Response(null, { status: 204 });
  }
  // quem está logado (o dono, ou uma pessoa da ETM) não é visita do portfólio, em qualquer navegador
  if (/sb-[^=;]*-auth-token/.test(request.headers.get("cookie") ?? "")) {
    return new Response(null, { status: 204 });
  }
  const body = await request.json().catch(() => null);
  const tipo = body?.tipo;
  const caminho = String(body?.caminho ?? "").slice(0, 200);
  if ((tipo !== "view" && tipo !== "click") || !caminho.startsWith("/")) {
    return new Response(null, { status: 400 });
  }
  if (PRIVADAS.test(caminho)) return new Response(null, { status: 204 });

  const db = supabaseAdmin();
  if (!db) return new Response(null, { status: 204 });

  const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const referrer = texto(body.referrer, 300);
  const tela = typeof body.tela === "string" && /^\d{2,5}x\d{2,5}$/.test(body.tela) ? body.tela : null;
  const interagiu = typeof body.interagiu === "boolean" ? body.interagiu : null;
  const tempo = Number.isFinite(body.tempo_ms) ? Math.min(Math.max(Math.round(body.tempo_ms), 0), 600_000) : null;

  // Sinais de falso positivo. Só vale para o contador novo (v: 2): páginas abertas com o script antigo
  // não mandam esses dados e não podem ser tratadas como suspeitas por isso.
  const motivos: string[] = [];
  if (body.v === 2) {
    if (body.webdriver === true) motivos.push("navegador automatizado");
    if (!tela || tela === "0x0") motivos.push("sem tamanho de tela");
    if (tipo === "view" && interagiu === false && tempo !== null && tempo < 1000) motivos.push("saiu sem interagir em menos de 1 s");
  }
  if (tipo === "view") {
    // várias visitas idênticas no mesmo instante: prévia de link ou carregamento duplicado, não gente
    const desde = new Date(Date.now() - 3000).toISOString();
    const consulta = db.from("eventos").select("id", { count: "exact", head: true }).eq("tipo", "view").eq("caminho", caminho).gte("created_at", desde);
    const { count } = await (referrer ? consulta.eq("referrer", referrer) : consulta.is("referrer", null));
    if ((count ?? 0) >= 1) motivos.push("rajada de visitas idênticas");
  }

  await db.from("eventos").insert({
    tipo,
    caminho,
    alvo: texto(body.alvo, 200),
    sessao: texto(body.sessao, 64),
    referrer,
    aparelho: resumirAparelho(ua),
    tela,
    idioma: texto(body.idioma, 20),
    fuso: texto(body.fuso, 60),
    pais: texto(request.headers.get("x-vercel-ip-country"), 2),
    interagiu,
    tempo_ms: tempo,
    suspeito: motivos.length > 0,
    motivo_suspeita: motivos.length ? motivos.join("; ") : null,
  });
  return new Response(null, { status: 204 });
}
