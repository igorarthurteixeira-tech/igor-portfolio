import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trocarCodigo } from "@/lib/redes/youtube";

export const dynamic = "force-dynamic";

/** Volta do Google com o código: confere o estado, guarda o token só no servidor e retorna ao painel. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const volta = (resultado: string) =>
    NextResponse.redirect(new URL(`/admin/publicacoes?youtube=${resultado}`, url.origin));

  if (!(await getAdminUser())) return NextResponse.redirect(new URL("/admin/login", url.origin));

  const cookie = request.headers.get("cookie") ?? "";
  const esperado = /(?:^|;\s*)yt_estado=([a-f0-9]+)/.exec(cookie)?.[1];
  const estado = url.searchParams.get("state");
  const codigo = url.searchParams.get("code");
  if (url.searchParams.get("error")) return volta("negado");
  if (!codigo || !estado || !esperado || estado !== esperado) return volta("invalido");

  const db = supabaseAdmin();
  if (!db) return volta("erro");
  try {
    const { refresh, email } = await trocarCodigo(codigo);
    const { error } = await db.from("redes_conexoes").upsert({
      rede: "youtube",
      conta_id: "youtube",
      conta_nome: email,
      token: refresh,
      expira_em: null,
      atualizado_em: new Date().toISOString(),
    });
    if (error) return volta("erro");
  } catch {
    return volta("erro");
  }
  const resposta = volta("ok");
  resposta.cookies.delete({ name: "yt_estado", path: "/api/redes/youtube" });
  return resposta;
}
