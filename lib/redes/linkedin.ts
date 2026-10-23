const API = "https://api.linkedin.com";
const AUTORIZAR = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";

/** Versão da API (AAAAMM). A documentação lista versões recentes; a 202511 sai do ar em 16/11/2026. */
const VERSAO = process.env.LINKEDIN_API_VERSION ?? "202610";

// openid + profile só para descobrir quem é o membro; w_member_social para publicar em nome dele.
const ESCOPOS = ["openid", "profile", "w_member_social"];

export const URL_RETORNO_LI =
  process.env.LINKEDIN_REDIRECT_URI ?? "https://www.igorarthurdev.com.br/api/redes/linkedin/retorno";

function credenciais() {
  const id = process.env.LINKEDIN_CLIENT_ID;
  const segredo = process.env.LINKEDIN_CLIENT_SECRET;
  if (!id || !segredo) throw new Error("LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET não estão configurados.");
  return { id, segredo };
}

async function erroDaApi(r: Response, padrao: string) {
  try {
    const j = await r.json();
    const msg = j?.message ?? j?.error_description ?? j?.error;
    return typeof msg === "string" ? `${padrao}: ${msg}` : padrao;
  } catch {
    return padrao;
  }
}

const cabecalhos = (token: string, json = false): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  "linkedin-version": VERSAO,
  "x-restli-protocol-version": "2.0.0",
  ...(json ? { "content-type": "application/json" } : {}),
});

export function urlDeAutorizacao(estado: string) {
  const { id } = credenciais();
  const p = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: URL_RETORNO_LI,
    state: estado,
    scope: ESCOPOS.join(" "),
  });
  return `${AUTORIZAR}?${p}`;
}

/** Troca o código do retorno pelo token de acesso (60 dias) e descobre o membro. */
export async function trocarCodigo(codigo: string) {
  const { id, segredo } = credenciais();
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: URL_RETORNO_LI,
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O LinkedIn recusou a autorização"));
  const j = await r.json();
  const token = j.access_token as string;
  const segundos = Number(j.expires_in ?? 5184000);

  const eu = await fetch(`${API}/v2/userinfo`, { headers: { authorization: `Bearer ${token}` } });
  if (!eu.ok) throw new Error(await erroDaApi(eu, "Não foi possível identificar a conta do LinkedIn"));
  const perfil = await eu.json();
  return {
    token,
    expiraEm: new Date(Date.now() + segundos * 1000).toISOString(),
    contaId: perfil.sub as string,
    nome: (perfil.name as string | undefined) ?? "",
  };
}

type Parte = { uploadUrl: string; firstByte: number; lastByte: number };

/** 1) Registra o envio do vídeo. */
export async function iniciarVideo(token: string, contaId: string, tamanho: number) {
  const r = await fetch(`${API}/rest/videos?action=initializeUpload`, {
    method: "POST",
    headers: cabecalhos(token, true),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: `urn:li:person:${contaId}`,
        fileSizeBytes: tamanho,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O LinkedIn recusou o envio do vídeo"));
  const v = (await r.json()).value;
  return { video: v.video as string, uploadToken: (v.uploadToken as string) ?? "", partes: v.uploadInstructions as Parte[] };
}

/** 2) Envia as partes (4 MB cada) e devolve o ETag de cada uma, na ordem. */
export async function enviarPartes(video: ArrayBuffer, partes: Parte[]) {
  const ids: string[] = [];
  for (const p of partes) {
    const r = await fetch(p.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: video.slice(p.firstByte, p.lastByte + 1),
    });
    if (!r.ok) throw new Error(await erroDaApi(r, "Falha ao enviar o vídeo ao LinkedIn"));
    const etag = r.headers.get("etag");
    if (!etag) throw new Error("O LinkedIn não devolveu a confirmação da parte enviada.");
    ids.push(etag.replace(/^"|"$/g, ""));
  }
  return ids;
}

/** 3) Fecha o envio. */
export async function finalizarVideo(token: string, video: string, uploadToken: string, ids: string[]) {
  const r = await fetch(`${API}/rest/videos?action=finalizeUpload`, {
    method: "POST",
    headers: cabecalhos(token, true),
    body: JSON.stringify({ finalizeUploadRequest: { video, uploadToken, uploadedPartIds: ids } }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O LinkedIn não conseguiu finalizar o vídeo"));
}

/** PROCESSING, AVAILABLE, PROCESSING_FAILED ou WAITING_UPLOAD. */
export async function statusDoVideo(token: string, urn: string) {
  const r = await fetch(`${API}/rest/videos/${encodeURIComponent(urn)}`, { headers: cabecalhos(token) });
  if (!r.ok) throw new Error(await erroDaApi(r, "Não foi possível consultar o vídeo no LinkedIn"));
  const j = await r.json();
  return { status: j.status as string, motivo: j.processingFailureReason as string | undefined };
}

/** O texto de uma publicação usa marcas especiais: escapa as que poderiam cortar ou alterar o texto. */
const escapar = (texto: string) => texto.replace(/[\\|{}@[\]()<>*_~]/g, (m) => `\\${m}`);

/** 4) Cria a publicação no feed, pública, com o vídeo. */
export async function criarPublicacao(token: string, contaId: string, video: string, texto: string, titulo: string) {
  const r = await fetch(`${API}/rest/posts`, {
    method: "POST",
    headers: cabecalhos(token, true),
    body: JSON.stringify({
      author: `urn:li:person:${contaId}`,
      commentary: escapar(texto).slice(0, 3000),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { title: titulo.slice(0, 200), id: video } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "O LinkedIn recusou a publicação"));
  const id = r.headers.get("x-restli-id") ?? "";
  return { id, link: id ? `https://www.linkedin.com/feed/update/${id}/` : null };
}
