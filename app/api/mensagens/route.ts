import { supabaseAdmin } from "@/lib/supabase/admin";
import { permitir } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!permitir(request, "mensagens", 5, 10 * 60_000)) {
    return Response.json(
      { erro: "Muitas mensagens em pouco tempo. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  // Campo-isca: bots preenchem, pessoas não veem.
  if (body.site) return Response.json({ ok: true });

  const nome = String(body.nome ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const mensagem = String(body.mensagem ?? "").trim().slice(0, 4000);

  if (nome.length < 2 || !EMAIL.test(email) || mensagem.length < 10) {
    return Response.json(
      {
        erro: "Preencha nome, e-mail válido e uma mensagem com pelo menos 10 caracteres.",
      },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  if (!db) {
    return Response.json(
      { erro: "Envio indisponível no momento." },
      { status: 503 },
    );
  }

  const { error } = await db
    .from("mensagens")
    .insert({ nome, email, mensagem });
  if (error) {
    return Response.json({ erro: "Não foi possível enviar." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
