import { cadastrarProduto } from "@/lib/escritorio/catalogo";
import { ofertaValida, type Oferta } from "@/lib/escritorio/fonte";
import { bancoEscritorio, usuarioDe } from "@/lib/escritorio/rodada";
import { permitir } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Escolhe um produto encontrado na busca: confere nas lojas e coloca no catálogo. */
export async function POST(request: Request) {
  if (!permitir(request, "escritorio-produto", 15, 10 * 60_000)) {
    return Response.json({ erro: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });
  }
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  const usuario = await usuarioDe(db, request);
  if (!usuario) return Response.json({ erro: "Entre na sua conta." }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as { ofertas?: unknown[] } | null;
  const ofertas = (Array.isArray(corpo?.ofertas) ? corpo.ofertas.slice(0, 12) : []).map(ofertaValida).filter((o): o is Oferta => !!o);
  if (!ofertas.length) return Response.json({ erro: "Produto inválido." }, { status: 400 });
  try {
    return Response.json({ produto: await cadastrarProduto(db, ofertas, usuario.id) });
  } catch (e) {
    console.error("escritorio: cadastro de produto falhou", e);
    const msg = e instanceof Error && e.message.startsWith("Nenhuma") ? e.message : "Não consegui cadastrar o produto.";
    return Response.json({ erro: msg }, { status: 502 });
  }
}
