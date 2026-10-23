import { supabaseAdmin } from "@/lib/supabase/admin";
import { executarRede, REDES_AUTOMATICAS } from "@/lib/redes/executar";
import type { Publicacao } from "@/lib/publicacoes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chamado por um agendador (a cada poucos minutos). Publica o que já chegou na hora.
 * Protegido pela chave CRON_SECRET: Authorization: Bearer <chave>.
 */
async function tratar(request: Request) {
  const chave = process.env.CRON_SECRET;
  if (!chave) return Response.json({ erro: "CRON_SECRET não configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${chave}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return Response.json({ erro: "Supabase não configurado." }, { status: 503 });

  const { data } = await db
    .from("publicacoes")
    .select("*")
    .not("agendada_em", "is", null)
    .lte("agendada_em", new Date().toISOString())
    .order("agendada_em", { ascending: true })
    .limit(20);

  const fila: { id: string; rede: (typeof REDES_AUTOMATICAS)[number] }[] = [];
  for (const p of (data ?? []) as Publicacao[]) {
    for (const rede of REDES_AUTOMATICAS) {
      const estado = p.status_redes[rede];
      if (p.redes.includes(rede) && (estado === "pendente" || estado === "processando")) {
        fila.push({ id: p.id, rede });
      }
    }
  }

  const resultados: { id: string; rede: string; estado: string; mensagem: string }[] = [];
  for (const item of fila.slice(0, 3)) {
    const r = await executarRede(item.id, item.rede, 15_000);
    resultados.push({ ...item, estado: r.estado, mensagem: r.mensagem });
  }
  return Response.json({ verificadas: fila.length, processadas: resultados });
}

export const GET = tratar;
export const POST = tratar;
