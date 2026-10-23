import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { urlDeAutorizacao } from "@/lib/redes/linkedin";

export const dynamic = "force-dynamic";

/** Começa a conexão com o LinkedIn: manda o administrador para a tela de autorização. */
export async function GET(request: Request) {
  if (!(await getAdminUser())) return NextResponse.redirect(new URL("/admin/login", request.url));

  let destino: string;
  const estado = randomBytes(24).toString("hex");
  try {
    destino = urlDeAutorizacao(estado);
  } catch {
    return NextResponse.redirect(new URL("/admin/publicacoes?linkedin=sem-configuracao", request.url));
  }
  const resposta = NextResponse.redirect(destino);
  resposta.cookies.set("li_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/redes/linkedin",
    maxAge: 600,
  });
  return resposta;
}
