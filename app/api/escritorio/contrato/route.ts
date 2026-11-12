import {
  DURACOES,
  MAX_DIAS_GRATIS,
  bancoEscritorio,
  escritorioDoUsuario,
  executarManual,
  lerEstado,
  produtosPorIds,
  usuarioDe,
} from "@/lib/escritorio/rodada";
import { permitir } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Assina um contrato de pesquisa: um pesquisador livre passa a pesquisar um produto por N dias.
 * Não existe cancelamento. Logo depois de assinar, o pesquisador já faz a primeira visita às lojas.
 */
export async function POST(request: Request) {
  if (!permitir(request, "escritorio-contrato", 10, 10 * 60_000)) {
    return Response.json({ erro: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });
  }
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  const usuario = await usuarioDe(db, request);
  if (!usuario) return Response.json({ erro: "Entre na sua conta." }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as { funcionario_id?: string; produto_id?: string; dias?: number } | null;
  const dias = Number(corpo?.dias);
  if (typeof corpo?.produto_id !== "string" || !(await produtosPorIds(db, [corpo.produto_id])).length) {
    return Response.json({ erro: "Produto inválido." }, { status: 400 });
  }
  if (!(DURACOES as readonly number[]).includes(dias)) return Response.json({ erro: "Duração inválida." }, { status: 400 });

  const dados = await escritorioDoUsuario(db, usuario.id);
  if (!dados) return Response.json({ erro: "Escritório não encontrado." }, { status: 404 });
  if (dados.escritorio.plano === "gratis" && dias > MAX_DIAS_GRATIS) {
    return Response.json({ erro: `No plano grátis o contrato vai até ${MAX_DIAS_GRATIS} dias.` }, { status: 403 });
  }
  const pesquisador = dados.funcionarios.find((f) => f.id === corpo?.funcionario_id && f.papel === "pesquisador");
  if (!pesquisador) return Response.json({ erro: "Pesquisador não encontrado." }, { status: 404 });

  const inicio = new Date();
  const fim = new Date(inicio.getTime() + dias * 86_400_000);
  const { error } = await db.from("contratos").insert({
    escritorio_id: dados.escritorio.id,
    funcionario_id: pesquisador.id,
    produto_id: corpo!.produto_id,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  });
  if (error) {
    const conhecido = ["contrato em andamento", "já acompanha este produto"].find((t) => error.message.includes(t));
    const erro =
      conhecido === "contrato em andamento"
        ? "Este pesquisador já está com um contrato em andamento."
        : conhecido
          ? "Outro pesquisador do seu escritório já acompanha este produto."
          : "Não consegui assinar o contrato.";
    return Response.json({ erro }, { status: conhecido ? 409 : 500 });
  }

  // primeira visita às lojas já com o contrato novo
  try {
    await executarManual(db, usuario.id);
  } catch (e) {
    console.error("escritorio: primeira rodada do contrato falhou", e);
  }
  return Response.json({ ...(await lerEstado(db, usuario.id)), novoContrato: true });
}
