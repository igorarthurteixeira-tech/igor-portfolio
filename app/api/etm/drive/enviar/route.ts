import { NextResponse } from "next/server";
import { PREFIXO_SESSAO } from "@/lib/drive";
import { getEtmUser } from "@/lib/etm-servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// o corpo de uma requisição na Vercel é limitado a 4,5 MB: o navegador manda pedaços de 4 MiB
const MAX_PEDACO = 4_400_000;

/**
 * Recebe um pedaço do arquivo e repassa ao Drive na sessão de envio já aberta.
 * O navegador não conversa com o Google: só quem está logado chega aqui.
 */
export async function POST(request: Request) {
  if (!(await getEtmUser())) return NextResponse.json({ ok: false, erro: "Sem permissão." }, { status: 401 });

  const sessao = new URL(request.url).searchParams.get("sessao") ?? "";
  // só endereços de envio do próprio Drive: o servidor nunca repassa para outro destino
  if (!sessao.startsWith(PREFIXO_SESSAO) || !sessao.includes("upload_id=")) {
    return NextResponse.json({ ok: false, erro: "Sessão de envio inválida." }, { status: 400 });
  }

  const inicio = Number(request.headers.get("x-inicio"));
  const total = Number(request.headers.get("x-total"));
  const corpo = await request.arrayBuffer();
  const tamanho = corpo.byteLength;
  if (!Number.isInteger(inicio) || !Number.isInteger(total) || inicio < 0 || total < 1 || tamanho < 1 || tamanho > MAX_PEDACO) {
    return NextResponse.json({ ok: false, erro: "Pedaço inválido." }, { status: 400 });
  }
  const fim = inicio + tamanho - 1;
  if (fim >= total) return NextResponse.json({ ok: false, erro: "Pedaço fora do tamanho do arquivo." }, { status: 400 });

  const r = await fetch(sessao, {
    method: "PUT",
    headers: { "content-range": `bytes ${inicio}-${fim}/${total}`, "content-length": String(tamanho) },
    body: corpo,
    redirect: "manual",
  });
  if (r.status === 308) return NextResponse.json({ ok: true, completo: false });
  if (r.status === 200 || r.status === 201) return NextResponse.json({ ok: true, completo: true });
  return NextResponse.json({ ok: false, erro: `O Google Drive recusou o envio (código ${r.status}).` }, { status: 502 });
}
