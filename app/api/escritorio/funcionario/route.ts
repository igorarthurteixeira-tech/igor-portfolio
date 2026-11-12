import { MAX_PESQUISADORES } from "@/components/escritorio/planta";
import { bancoEscritorio, escritorioDoUsuario, lerEstado, usuarioDe } from "@/lib/escritorio/rodada";
import { permitir } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function contexto(request: Request) {
  const db = bancoEscritorio();
  if (!db) return { erro: Response.json({ erro: "Banco não configurado." }, { status: 503 }) };
  const usuario = await usuarioDe(db, request);
  if (!usuario) return { erro: Response.json({ erro: "Entre na sua conta." }, { status: 401 }) };
  const dados = await escritorioDoUsuario(db, usuario.id);
  if (!dados) return { erro: Response.json({ erro: "Escritório não encontrado." }, { status: 404 }) };
  if (dados.escritorio.plano !== "pago") {
    return { erro: Response.json({ erro: "Disponível no plano pago." }, { status: 403 }) };
  }
  return { db, usuario, dados };
}

/** Contrata mais um pesquisador (plano pago). Ele chega livre, sem contrato. */
export async function POST(request: Request) {
  if (!permitir(request, "escritorio-funcionario", 20, 10 * 60_000)) {
    return Response.json({ erro: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });
  }
  const c = await contexto(request);
  if ("erro" in c) return c.erro;
  const pesquisadores = c.dados.funcionarios.filter((f) => f.papel === "pesquisador").length;
  if (pesquisadores >= MAX_PESQUISADORES) {
    return Response.json({ erro: `O escritório comporta até ${MAX_PESQUISADORES} pesquisadores por enquanto.` }, { status: 409 });
  }
  const { error } = await c.db
    .from("funcionarios")
    .insert({ escritorio_id: c.dados.escritorio.id, papel: "pesquisador", nome: `Pesquisador ${pesquisadores + 1}` });
  if (error) return Response.json({ erro: "Não consegui contratar." }, { status: 500 });
  return Response.json(await lerEstado(c.db, c.usuario.id));
}

/** Renomeia um funcionário (plano pago). */
export async function PATCH(request: Request) {
  const c = await contexto(request);
  if ("erro" in c) return c.erro;
  const corpo = (await request.json().catch(() => null)) as { id?: string; nome?: string } | null;
  const nome = String(corpo?.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!nome) return Response.json({ erro: "Digite um nome." }, { status: 400 });
  if (!c.dados.funcionarios.some((f) => f.id === corpo?.id)) return Response.json({ erro: "Funcionário não encontrado." }, { status: 404 });
  const { error } = await c.db.from("funcionarios").update({ nome }).eq("id", corpo!.id!);
  if (error) return Response.json({ erro: "Não consegui renomear." }, { status: 500 });
  return Response.json(await lerEstado(c.db, c.usuario.id));
}
