import { acessoDrive, abrirArquivo } from "@/lib/drive";
import { MIME_ETM } from "@/lib/etm";
import { ehUuid, getEtmUser } from "@/lib/etm-servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;


/**
 * Entrega um arquivo guardado no Drive para quem está logado: o player e o botão Baixar apontam para cá.
 * Aceita pedidos de trecho (Range), que o player usa para avançar o vídeo.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getEtmUser())) return new Response("Não autorizado.", { status: 401 });
  const { id } = await ctx.params;
  if (!ehUuid(id)) return new Response("Arquivo não encontrado.", { status: 404 });

  const db = supabaseAdmin();
  if (!db) return new Response("Serviço indisponível.", { status: 503 });
  const { data: arquivo } = await db.from("etm_arquivos").select("caminho,nome").eq("id", id).maybeSingle();
  if (!arquivo || !String(arquivo.caminho).startsWith("drive:")) return new Response("Arquivo não encontrado.", { status: 404 });

  let acesso: string | null;
  try {
    acesso = await acessoDrive(db);
  } catch {
    return new Response("A conexão com o Google Drive precisa ser refeita.", { status: 503 });
  }
  if (!acesso) return new Response("O Google Drive não está conectado.", { status: 503 });

  const origem = await abrirArquivo(acesso, String(arquivo.caminho).slice("drive:".length), request.headers.get("range"));
  if (!origem.ok && origem.status !== 206) return new Response("O Drive não entregou o arquivo.", { status: 502 });

  const nome = String(arquivo.nome);
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const headers = new Headers();
  for (const h of ["content-length", "content-range", "accept-ranges", "etag"]) {
    const v = origem.headers.get(h);
    if (v) headers.set(h, v);
  }
  const tipo = origem.headers.get("content-type");
  headers.set("content-type", !tipo || tipo.startsWith("application/octet-stream") ? (MIME_ETM[ext] ?? "application/octet-stream") : tipo);
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  if (new URL(request.url).searchParams.get("baixar") === "1") {
    headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`);
  }
  return new Response(origem.body, { status: origem.status, headers });
}
