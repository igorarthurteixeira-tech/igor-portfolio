const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3";

// Só envio de vídeos (e, para mostrar a conta, o e-mail). Nada de leitura do canal.
const ESCOPOS = ["https://www.googleapis.com/auth/youtube.upload", "openid", "email"];

export const URL_RETORNO =
  process.env.YOUTUBE_REDIRECT_URI ?? "https://www.igorarthurdev.com.br/api/redes/youtube/retorno";

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

export function urlDeAutorizacao(estado: string) {
  const { id } = credenciais();
  const p = new URLSearchParams({
    client_id: id,
    redirect_uri: URL_RETORNO,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: estado,
  });
  return `${AUTORIZAR}?${p}`;
}

/** Troca o código do retorno do Google pelo token de renovação (e o e-mail da conta). */
export async function trocarCodigo(codigo: string) {
  const { id, segredo } = credenciais();
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: URL_RETORNO,
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

export async function tokenDeAcesso(refresh: string) {
  const { id, segredo } = credenciais();
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: segredo,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "A conexão com o YouTube expirou. Conecte de novo"));
  const j = await r.json();
  return j.access_token as string;
}

export type Envio = { id: string; privacidade: string };

/** Envio em duas etapas (iniciar + enviar os bytes). Devolve o id e a visibilidade que o YouTube aplicou. */
export async function enviarVideo(
  acesso: string,
  video: ArrayBuffer,
  meta: { titulo: string; descricao: string; publico: boolean },
): Promise<Envio> {
  const inicio = await fetch(`${UPLOAD}/videos?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${acesso}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": "video/mp4",
      "x-upload-content-length": String(video.byteLength),
    },
    body: JSON.stringify({
      snippet: { title: meta.titulo.slice(0, 100), description: meta.descricao.slice(0, 5000), categoryId: "24" },
      status: {
        privacyStatus: meta.publico ? "public" : "private",
        selfDeclaredMadeForKids: false,
      },
    }),
  });
  if (!inicio.ok) throw new Error(await erroDaApi(inicio, "O YouTube recusou o envio"));
  const destino = inicio.headers.get("location");
  if (!destino) throw new Error("O YouTube não devolveu o endereço de envio.");

  const envio = await fetch(destino, {
    method: "PUT",
    headers: { "content-type": "video/mp4", "content-length": String(video.byteLength) },
    body: video,
  });
  if (!envio.ok) throw new Error(await erroDaApi(envio, "Falha ao enviar o vídeo ao YouTube"));
  const j = await envio.json();
  return { id: j.id as string, privacidade: (j.status?.privacyStatus as string) ?? "desconhecida" };
}

export async function definirCapa(acesso: string, videoId: string, imagem: ArrayBuffer, tipo: string) {
  const r = await fetch(`${UPLOAD}/thumbnails/set?videoId=${encodeURIComponent(videoId)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${acesso}`, "content-type": tipo },
    body: imagem,
  });
  if (!r.ok) throw new Error(await erroDaApi(r, "Capa não aplicada"));
}
