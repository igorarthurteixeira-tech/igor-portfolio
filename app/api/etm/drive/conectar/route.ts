import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { urlDeAutorizacaoDrive } from "@/lib/drive";

export const dynamic = "force-dynamic";

/** Começa a conexão com o Google Drive: manda o administrador para a tela de autorização do Google. */
export async function GET(request: Request) {
  if (!(await getAdminUser())) return NextResponse.redirect(new URL("/admin/login", request.url));

  let destino: string;
  const estado = randomBytes(24).toString("hex");
  try {
    destino = urlDeAutorizacaoDrive(estado);
  } catch {
    return NextResponse.redirect(new URL("/admin/etm?drive=sem-configuracao", request.url));
  }
  const resposta = NextResponse.redirect(destino);
  resposta.cookies.set("drive_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/etm/drive",
    maxAge: 600,
  });
  return resposta;
}
