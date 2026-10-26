/**
 * Instagram (API com login do Instagram): publica Reels e carrosséis em conta profissional.
 * Fluxo: cria o "container", espera o processamento e publica. No carrossel, cada imagem
 * vira um container filho e o container do carrossel junta os filhos.
 */

const VERSAO = process.env.INSTAGRAM_API_VERSION ?? "v23.0";
const BASE = `https://graph.instagram.com/${VERSAO}`;

type Params = Record<string, string | number | boolean | undefined>;

async function chamar<T extends object = Record<string, unknown>>(
  caminho: string,
  params: Params,
  metodo: "GET" | "POST" = "GET",
): Promise<T> {
  const pares = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)]);
  const url = new URL(caminho.startsWith("http") ? caminho : `${BASE}${caminho}`);
  const init: RequestInit = { method: metodo, cache: "no-store" };
  if (metodo === "GET") pares.forEach(([k, v]) => url.searchParams.set(k, v));
  else init.body = new URLSearchParams(pares);
  const r = await fetch(url, init);
  const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!r.ok || j.error) {
    throw new Error(j.error?.message ?? `O Instagram respondeu com erro ${r.status}.`);
  }
  return j;
}

/** Confere o token e descobre a conta. */
export async function validarToken(token: string) {
  const j = await chamar<{ id?: string; user_id?: string; username?: string }>("/me", {
    fields: "user_id,username",
    access_token: token,
  });
  const contaId = j.user_id ?? j.id;
  if (!contaId) throw new Error("Não foi possível identificar a conta do Instagram.");
  return { contaId: String(contaId), usuario: j.username ?? "" };
}

/** Renova o token de longa duração (precisa ter mais de 24 h e não estar vencido). */
export async function renovarToken(token: string) {
  const j = await chamar<{ access_token: string; expires_in: number }>(
    "https://graph.instagram.com/refresh_access_token",
    { grant_type: "ig_refresh_token", access_token: token },
  );
  return {
    token: j.access_token,
    expiraEm: new Date(Date.now() + j.expires_in * 1000).toISOString(),
  };
}

export async function criarContainerReel(
  contaId: string,
  token: string,
  videoUrl: string,
  legenda: string,
  capaUrl?: string,
) {
  const j = await chamar<{ id: string }>(
    `/${contaId}/media`,
    {
      media_type: "REELS",
      video_url: videoUrl,
      caption: legenda,
      share_to_feed: true,
      cover_url: capaUrl,
      access_token: token,
    },
    "POST",
  );
  return j.id;
}

/** Uma imagem do carrossel (JPEG público, até 8 MB). */
export async function criarItemCarrossel(contaId: string, token: string, imagemUrl: string) {
  const j = await chamar<{ id: string }>(
    `/${contaId}/media`,
    { image_url: imagemUrl, is_carousel_item: true, access_token: token },
    "POST",
  );
  return j.id;
}

/** O carrossel em si, juntando os containers das imagens (2 a 10), na ordem dos slides. */
export async function criarContainerCarrossel(contaId: string, token: string, filhos: string[], legenda: string) {
  const j = await chamar<{ id: string }>(
    `/${contaId}/media`,
    { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda, access_token: token },
    "POST",
  );
  return j.id;
}

export async function statusContainer(containerId: string, token: string) {
  const j = await chamar<{ status_code?: string; status?: string }>(`/${containerId}`, {
    fields: "status_code,status",
    access_token: token,
  });
  return { codigo: j.status_code ?? "IN_PROGRESS", detalhe: j.status };
}

export async function publicarContainer(contaId: string, token: string, containerId: string) {
  const j = await chamar<{ id: string }>(
    `/${contaId}/media_publish`,
    { creation_id: containerId, access_token: token },
    "POST",
  );
  return j.id;
}

export async function linkDaPublicacao(mediaId: string, token: string) {
  try {
    const j = await chamar<{ permalink?: string }>(`/${mediaId}`, {
      fields: "permalink",
      access_token: token,
    });
    return j.permalink ?? null;
  } catch {
    return null;
  }
}
