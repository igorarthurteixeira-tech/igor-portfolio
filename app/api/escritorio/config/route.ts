import { montarLayout, normalizarConfig, verificar } from "@/components/escritorio/planta";
import { bancoEscritorio, escritorioDoUsuario, lerEstado, usuarioDe } from "@/lib/escritorio/rodada";

export const dynamic = "force-dynamic";

/** Salva o nome e a customização do escritório (plano pago). */
export async function PATCH(request: Request) {
  const db = bancoEscritorio();
  if (!db) return Response.json({ erro: "Banco não configurado." }, { status: 503 });
  const usuario = await usuarioDe(db, request);
  if (!usuario) return Response.json({ erro: "Entre na sua conta." }, { status: 401 });
  const dados = await escritorioDoUsuario(db, usuario.id);
  if (!dados) return Response.json({ erro: "Escritório não encontrado." }, { status: 404 });
  if (dados.escritorio.plano !== "pago") return Response.json({ erro: "Disponível no plano pago." }, { status: 403 });

  const corpo = (await request.json().catch(() => null)) as { nome?: string; config?: unknown } | null;
  const nome = String(corpo?.nome ?? dados.escritorio.nome).trim().replace(/\s+/g, " ").slice(0, 40) || "Meu escritório";
  const config = normalizarConfig(corpo?.config);
  // uniformes e mesas só de funcionários deste escritório
  const ids = new Set(dados.funcionarios.map((f) => f.id));
  config.uniformes = Object.fromEntries(Object.entries(config.uniformes).filter(([k]) => ids.has(k)));
  config.mesas = Object.fromEntries(Object.entries(config.mesas).filter(([k]) => ids.has(k)));

  // a arrumação precisa deixar a equipe trabalhar (a mesma regra da tela)
  const layout = montarLayout(
    dados.funcionarios.map((f) => ({ chave: f.id, papel: f.papel, nome: f.nome })),
    config.mesas,
    config.ampliacao,
    config.ampliacaoLateral,
    config.estacoes,
  );
  const r = verificar({ layout, itens: config.itens });
  if (!r.ok) return Response.json({ erro: r.motivo }, { status: 400 });

  const { error } = await db.from("escritorios").update({ nome, config }).eq("id", dados.escritorio.id);
  if (error) return Response.json({ erro: "Não consegui salvar." }, { status: 500 });
  return Response.json(await lerEstado(db, usuario.id));
}
