import { bancoEscritorio, escritorioDoUsuario, executarManual, lerEstado, usuarioDe } from "@/lib/escritorio/rodada";
import { permitir } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAUSA_ENTRE_RODADAS_MS = 2 * 60_000;

/** Estado da tela: preços (público) e, com login, o escritório do usuário. */
export async function GET(request: Request) {
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  const usuario = await usuarioDe(db, request);
  return Response.json(await lerEstado(db, usuario?.id ?? null));
}

/** Rodada pedida pelo dono do escritório. Se houve uma há pouco, devolve aquela. */
export async function POST(request: Request) {
  if (!permitir(request, "escritorio-rodada", 6, 10 * 60_000)) {
    return Response.json({ erro: "Muitas rodadas seguidas. Tente de novo em alguns minutos." }, { status: 429 });
  }
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  const usuario = await usuarioDe(db, request);
  if (!usuario) return Response.json({ erro: "Entre na sua conta para pedir uma rodada." }, { status: 401 });

  const dados = await escritorioDoUsuario(db, usuario.id);
  if (!dados) return Response.json({ erro: "Escritório não encontrado." }, { status: 404 });
  const { data: ultima } = await db
    .from("rodadas")
    .select("iniciada_em")
    .eq("escritorio_id", dados.escritorio.id)
    .order("iniciada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultima && Date.now() - new Date(ultima.iniciada_em).getTime() < PAUSA_ENTRE_RODADAS_MS) {
    return Response.json({ ...(await lerEstado(db, usuario.id)), repetida: true });
  }

  try {
    await executarManual(db, usuario.id);
    return Response.json({ ...(await lerEstado(db, usuario.id)), repetida: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "A rodada falhou.";
    console.error("escritorio: rodada manual falhou", e);
    return Response.json({ erro: msg }, { status: 400 });
  }
}
