import { bancoEscritorio, executarAgendada } from "@/lib/escritorio/rodada";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Coleta automática, chamada pelo agendador (pg_cron) a cada 3 horas.
 * Protegida pela chave CRON_SECRET: Authorization: Bearer <chave>.
 */
async function tratar(request: Request) {
  const chave = process.env.CRON_SECRET;
  if (!chave) return Response.json({ erro: "CRON_SECRET não configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${chave}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });

  try {
    return Response.json({ ok: true, ...(await executarAgendada(db)) });
  } catch (e) {
    console.error("escritorio: coleta agendada falhou", e);
    return Response.json({ erro: "A coleta falhou." }, { status: 500 });
  }
}

export const GET = tratar;
export const POST = tratar;
