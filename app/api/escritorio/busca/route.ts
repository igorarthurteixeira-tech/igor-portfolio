import { buscarNasLojas } from "@/lib/escritorio/busca";
import { bancoEscritorio, usuarioDe } from "@/lib/escritorio/rodada";
import { permitir } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Busca um produto em todas as lojas aceitas ("televisor 65 polegadas"). Só para quem tem conta. */
export async function GET(request: Request) {
  const termo = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (termo.length < 3) return Response.json({ erro: "Escreva o que você procura (ex.: televisor 65 polegadas)." }, { status: 400 });
  if (!permitir(request, "escritorio-busca", 20, 10 * 60_000)) {
    return Response.json({ erro: "Muitas buscas seguidas. Espere alguns minutos." }, { status: 429 });
  }
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  if (!(await usuarioDe(db, request))) return Response.json({ erro: "Entre na sua conta para pesquisar." }, { status: 401 });
  try {
    return Response.json(await buscarNasLojas(termo));
  } catch (e) {
    console.error("escritorio: busca falhou", e);
    return Response.json({ erro: "Não consegui pesquisar agora." }, { status: 500 });
  }
}
