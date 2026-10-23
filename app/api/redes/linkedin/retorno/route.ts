import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trocarCodigo } from "@/lib/redes/linkedin";

export const dynamic = "force-dynamic";

/** Volta do LinkedIn com o código: confere o estado, guarda o token só no servidor e retorna ao painel. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const volta = (resultado: string, motivo?: string) => {
    const destino = new URL(`/admin/publicacoes?linkedin=${resultado}`, url.origin);
    if (motivo) destino.searchParams.set("motivo", motivo.slice(0, 240));
    return NextResponse.redirect(destino);
  };

  if (!(await getAdminUser())) return NextResponse.redirect(new URL("/admin/login", url.origin));

  const cookie = request.headers.get("cookie") ?? "";
  const esperado = /(?:^|;\s*)li_estado=([a-f0-9]+)/.exec(cookie)?.[1];
  const estado = url.searchParams.get("state");
  const codigo = url.searchParams.get("code");
  const erroLi = url.searchParams.get("error");
  if (erroLi) {
    // o LinkedIn explica o que faltou (escopo não liberado, app sem verificação, pedido cancelado...)
    const detalhe = url.searchParams.get("error_description");
    return volta("negado", detalhe ? `${erroLi}: ${detalhe}` : erroLi);
  }
  if (!codigo || !estado || !esperado || estado !== esperado) return volta("invalido");

  const db = supabaseAdmin();
  if (!db) return volta("erro");
  try {
    const { token, expiraEm, contaId, nome } = await trocarCodigo(codigo);
    const { error } = await db.from("redes_conexoes").upsert({
      rede: "linkedin",
      conta_id: contaId,
      conta_nome: nome || null,
      token,
      expira_em: expiraEm,
      atualizado_em: new Date().toISOString(),
    });
    if (error) return volta("erro");
  } catch (e) {
    return volta("erro", e instanceof Error ? e.message : undefined);
  }
  const resposta = volta("ok");
  resposta.cookies.delete({ name: "li_estado", path: "/api/redes/linkedin" });
  return resposta;
}
