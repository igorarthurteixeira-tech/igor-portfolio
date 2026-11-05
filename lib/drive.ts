import { supabaseAdmin } from "@/lib/supabase/admin";

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const PASTA = "application/vnd.google-apps.folder";

// "drive.file": o sistema só enxerga o que ele mesmo criou na conta, nunca o resto do Drive.
const ESCOPOS = ["https://www.googleapis.com/auth/drive.file", "openid", "email"];

export const URL_RETORNO_DRIVE =
  process.env.DRIVE_REDIRECT_URI ?? "https://www.igorarthurdev.com.br/api/etm/drive/retorno";

/** Endereço que o Google devolve para continuar o envio em pedaços (e que nunca deve apontar para outro lugar). */
export const PREFIXO_SESSAO = `${UPLOAD}/files?`;

function credenciais() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const segredo = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !segredo) throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados.");
  return { id, segredo };
}

async function erroDaApi(r: Response, padrao: string) {
  try {
    const j = await r.json();
    const msg = j?.error?.message ?? j?.error_description ?? j?.error;
    return typeof msg === "string" ? `${padrao}: ${msg}` : padrao;
  } catch {
    return padrao;
  }
}

export function urlDeAutorizacaoDrive(estado: string) {
  const { id } = credenciais();
  const p = new URLSearchParams({
    client_id: id,
    redirect_uri: URL_RETORNO_DRIVE,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: estado,
  });
  return `${AUTORIZAR}?${p}`;
}

/** Troca o código do retorno do Google pelo token de renovação (e o e-mail da conta). */
export async function trocarCodigoDrive(codigo: string) {
  const { id, segredo } = credenciais();
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: URL_RETORNO_DRIVE,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O Google recusou a autorização"));
  const j = await r.json();
  if (!j.refresh_token) {
    throw new Error("O Google não devolveu o token de renovação. Remova o acesso em myaccount.google.com/permissions e conecte de novo.");
  }
  let email: string | null = null;
  try {
    const carga = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString());
    email = typeof carga.email === "string" ? carga.email : null;
  } catch {
    // o e-mail é só para exibição
  }
  return { refresh: j.refresh_token as string, email };
}

let cache: { token: string; expira: number } | null = null;

export function limparCacheDrive() {
  cache = null;
}

/** O Drive está conectado? (Só olha a conexão guardada, não chama o Google.) */
export async function driveConectado(db: Db) {
  const { data } = await db.from("redes_conexoes").select("rede").eq("rede", "drive").maybeSingle();
  return !!data;
}

/** Token de acesso do Drive (renovado quando preciso); null se o Drive não estiver conectado. */
export async function acessoDrive(db: Db): Promise<string | null> {
  if (cache && cache.expira > Date.now() + 60_000) return cache.token;
  const { data } = await db.from("redes_conexoes").select("token").eq("rede", "drive").maybeSingle();
  if (!data?.token) return null;
  const { id, segredo } = credenciais();
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: segredo,
      refresh_token: data.token as string,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "A conexão com o Google Drive expirou. Reconecte no painel"));
  const j = await r.json();
  cache = { token: j.access_token as string, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return cache.token;
}

const cabecalho = (acesso: string) => ({ authorization: `Bearer ${acesso}` });

async function criarPasta(acesso: string, nome: string, pai: string | null, props: Record<string, string>) {
  const r = await fetch(`${API}/files?fields=id`, {
    method: "POST",
    headers: { ...cabecalho(acesso), "content-type": "application/json" },
    body: JSON.stringify({ name: nome, mimeType: PASTA, ...(pai ? { parents: [pai] } : {}), appProperties: props }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O Drive recusou criar a pasta"));
  return (await r.json()).id as string;
}

/** Pasta "Pedidos ETM" na conta do Drive; criada na primeira vez e lembrada depois. */
async function pastaRaiz(db: Db, acesso: string) {
  const { data } = await db.from("redes_conexoes").select("conta_id").eq("rede", "drive_pasta").maybeSingle();
  if (data?.conta_id) return data.conta_id as string;
  const id = await criarPasta(acesso, "Pedidos ETM", null, { raiz: "etm" });
  await db.from("redes_conexoes").upsert({
    rede: "drive_pasta",
    conta_id: id,
    conta_nome: "Pedidos ETM",
    token: "-",
    expira_em: null,
    atualizado_em: new Date().toISOString(),
  });
  return id;
}

async function buscar(acesso: string, q: string, campos: string) {
  const p = new URLSearchParams({ q, fields: `files(${campos})`, pageSize: "10", spaces: "drive" });
  const r = await fetch(`${API}/files?${p}`, { headers: cabecalho(acesso) });
  if (!r.ok) throw new Error(await erroDaApi(r, "O Drive recusou a busca"));
  return ((await r.json()).files ?? []) as Record<string, string>[];
}

/** Os ids vêm sempre de UUIDs validados antes, por isso entram direto na busca. */
async function pastaDoPedido(db: Db, acesso: string, pedidoId: string, criar: boolean) {
  const achadas = await buscar(
    acesso,
    `appProperties has { key='pedido' and value='${pedidoId}' } and mimeType='${PASTA}' and trashed=false`,
    "id",
  );
  if (achadas[0]) return achadas[0].id;
  if (!criar) return null;
  return criarPasta(acesso, pedidoId, await pastaRaiz(db, acesso), { pedido: pedidoId });
}

/** Abre uma sessão de envio em partes no Drive e devolve o endereço dela. */
export async function iniciarSessao(
  db: Db,
  acesso: string,
  p: { pedidoId: string; uploadId: string; nome: string; tipo: string; tamanho: number },
) {
  const pasta = await pastaDoPedido(db, acesso, p.pedidoId, true);
  const r = await fetch(`${UPLOAD}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      ...cabecalho(acesso),
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": p.tipo || "application/octet-stream",
      "x-upload-content-length": String(p.tamanho),
    },
    body: JSON.stringify({
      name: p.nome,
      parents: [pasta],
      appProperties: { pedido: p.pedidoId, upload: p.uploadId },
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O Drive recusou o envio"));
  const destino = r.headers.get("location");
  if (!destino || !destino.startsWith(PREFIXO_SESSAO)) throw new Error("O Drive não devolveu o endereço de envio.");
  return destino;
}

/** Acha o arquivo que acabou de ser enviado, pelo código do envio (o navegador nunca informa o id do Drive). */
export async function acharEnvio(acesso: string, pedidoId: string, uploadId: string) {
  const achados = await buscar(
    acesso,
    `appProperties has { key='upload' and value='${uploadId}' } and appProperties has { key='pedido' and value='${pedidoId}' } and trashed=false`,
    "id,name,size",
  );
  const f = achados[0];
  return f ? { id: f.id, nome: f.name, tamanho: Number(f.size) || 0 } : null;
}

/** Baixa o arquivo (ou um trecho, quando o player pede) como resposta que pode ser repassada ao navegador. */
export function abrirArquivo(acesso: string, driveId: string, range: string | null) {
  return fetch(`${API}/files/${encodeURIComponent(driveId)}?alt=media`, {
    headers: { ...cabecalho(acesso), ...(range ? { range } : {}) },
  });
}

/** Muda o nome da pasta do pedido para "#12 · Título". Melhor esforço: se falhar, o nome antigo (o código) serve. */
export async function renomearPastaPedido(db: Db, pedidoId: string, nome: string) {
  try {
    const acesso = await acessoDrive(db);
    if (!acesso) return;
    const pasta = await pastaDoPedido(db, acesso, pedidoId, false);
    if (!pasta) return;
    await fetch(`${API}/files/${pasta}`, {
      method: "PATCH",
      headers: { ...cabecalho(acesso), "content-type": "application/json" },
      body: JSON.stringify({ name: nome.slice(0, 120) }),
    });
  } catch {
    // o nome da pasta é só para organizar
  }
}

/** Apaga a pasta do pedido e tudo que está nela. Melhor esforço. */
export async function apagarPastaPedido(db: Db, pedidoId: string) {
  try {
    const acesso = await acessoDrive(db);
    if (!acesso) return;
    const pasta = await pastaDoPedido(db, acesso, pedidoId, false);
    if (!pasta) return;
    await fetch(`${API}/files/${pasta}`, { method: "DELETE", headers: cabecalho(acesso) });
  } catch {
    // se não der para apagar, o painel do Drive ainda permite apagar à mão
  }
}

/** Apaga um arquivo do Drive. Melhor esforço: se falhar, o arquivo continua na pasta do pedido. */
export async function apagarArquivoDrive(db: Db, driveId: string) {
  try {
    const acesso = await acessoDrive(db);
    if (!acesso) return;
    await fetch(`${API}/files/${encodeURIComponent(driveId)}`, { method: "DELETE", headers: cabecalho(acesso) });
  } catch {
    // o arquivo pode ser apagado à mão na conta do Drive
  }
}
