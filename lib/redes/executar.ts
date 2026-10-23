import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BUCKET,
  type Detalhe,
  type Publicacao,
  type RedeId,
  type StatusRede,
} from "@/lib/publicacoes";
import * as ig from "./instagram";
import * as yt from "./youtube";

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

export const REDES_AUTOMATICAS: RedeId[] = ["instagram", "youtube"];
export type Resultado = { estado: StatusRede; mensagem: string };

const DIA = 86400000;

async function salvar(db: Db, id: string, rede: RedeId, estado: StatusRede, detalhe: Detalhe) {
  const { data } = await db
    .from("publicacoes")
    .select("status_redes,detalhes_redes")
    .eq("id", id)
    .single();
  const status = { ...((data?.status_redes as object) ?? {}), [rede]: estado };
  const detalhes = { ...((data?.detalhes_redes as object) ?? {}), [rede]: detalhe };
  await db.from("publicacoes").update({ status_redes: status, detalhes_redes: detalhes }).eq("id", id);
}

async function urlAssinada(db: Db, path: string) {
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3 * 3600);
  if (error || !data) throw new Error("Não foi possível gerar o link do arquivo no Storage.");
  return data.signedUrl;
}

/** Devolve o token pronto para uso, renovando-o quando falta pouco para vencer. */
async function tokenDoInstagram(db: Db) {
  const { data } = await db.from("redes_conexoes").select("*").eq("rede", "instagram").maybeSingle();
  if (!data) throw new Error("O Instagram ainda não está conectado. Conecte no topo da página.");
  let token = data.token as string;
  const expira = data.expira_em ? Date.parse(data.expira_em as string) : null;
  if (expira && expira - Date.now() < 20 * DIA) {
    try {
      const novo = await ig.renovarToken(token);
      token = novo.token;
      await db
        .from("redes_conexoes")
        .update({ token, expira_em: novo.expiraEm, atualizado_em: new Date().toISOString() })
        .eq("rede", "instagram");
    } catch {
      if (expira < Date.now()) throw new Error("O token do Instagram venceu. Conecte de novo.");
    }
  }
  return { token, contaId: data.conta_id as string };
}

/**
 * Faz uma publicação avançar um passo no Instagram: cria o container, espera o
 * processamento (até `esperaMs`) e publica. Se o Instagram ainda estiver
 * processando, deixa como "processando" para a próxima chamada continuar.
 */
export async function executarInstagram(id: string, esperaMs: number): Promise<Resultado> {
  const db = supabaseAdmin();
  if (!db) return { estado: "erro", mensagem: "Supabase não configurado." };

  const { data } = await db.from("publicacoes").select("*").eq("id", id).single();
  const pub = data as Publicacao | null;
  if (!pub) return { estado: "erro", mensagem: "Publicação não encontrada." };
  if (pub.status_redes.instagram === "publicado") {
    return { estado: "publicado", mensagem: "Já publicada no Instagram." };
  }

  let detalhe: Detalhe = { ...(pub.detalhes_redes.instagram ?? {}) };
  try {
    if (!pub.video_path) throw new Error("Esta publicação não tem vídeo.");
    const { token, contaId } = await tokenDoInstagram(db);

    if (!detalhe.container_id) {
      const legenda = pub.textos.instagram?.legenda ?? "";
      const video = await urlAssinada(db, pub.video_path);
      const capa = pub.capa_path ? await urlAssinada(db, pub.capa_path) : undefined;
      detalhe = { container_id: await ig.criarContainerReel(contaId, token, video, legenda, capa) };
      await salvar(db, id, "instagram", "processando", detalhe);
    }

    const limite = Date.now() + esperaMs;
    for (;;) {
      const st = await ig.statusContainer(detalhe.container_id as string, token);
      if (st.codigo === "FINISHED") break;
      if (st.codigo === "ERROR") {
        throw new Error(`O Instagram recusou o vídeo${st.detalhe ? `: ${st.detalhe}` : "."}`);
      }
      if (st.codigo === "EXPIRED") {
        await salvar(db, id, "instagram", "pendente", {});
        return { estado: "pendente", mensagem: "O processamento expirou. Tente de novo." };
      }
      if (Date.now() + 6000 > limite) {
        return {
          estado: "processando",
          mensagem: "O Instagram ainda está processando o vídeo. Clique de novo em alguns instantes.",
        };
      }
      await new Promise((r) => setTimeout(r, 5000));
    }

    const mediaId = await ig.publicarContainer(contaId, token, detalhe.container_id as string);
    const permalink = await ig.linkDaPublicacao(mediaId, token);
    await salvar(db, id, "instagram", "publicado", {
      media_id: mediaId,
      permalink,
      publicado_em: new Date().toISOString(),
    });
    return { estado: "publicado", mensagem: "Publicado no Instagram." };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido.";
    await salvar(db, id, "instagram", "erro", { erro });
    return { estado: "erro", mensagem: erro };
  }
}

async function baixar(db: Db, path: string) {
  const r = await fetch(await urlAssinada(db, path));
  if (!r.ok) throw new Error("Não foi possível ler o arquivo no Storage.");
  return { dados: await r.arrayBuffer(), tipo: r.headers.get("content-type") ?? "application/octet-stream" };
}

/**
 * Envia o vídeo ao YouTube. Um envio não pode ser repetido sem criar um vídeo duplicado,
 * então o início é registrado antes: se a função for interrompida no meio, a publicação
 * vira "erro" (sem tentar de novo sozinha) e você confere no YouTube antes de reenviar.
 */
export async function executarYoutube(id: string): Promise<Resultado> {
  const db = supabaseAdmin();
  if (!db) return { estado: "erro", mensagem: "Supabase não configurado." };

  const { data } = await db.from("publicacoes").select("*").eq("id", id).single();
  const pub = data as Publicacao | null;
  if (!pub) return { estado: "erro", mensagem: "Publicação não encontrada." };
  if (pub.status_redes.youtube === "publicado") return { estado: "publicado", mensagem: "Já publicada no YouTube." };

  if (pub.status_redes.youtube === "processando") {
    const inicio = Date.parse(pub.detalhes_redes.youtube?.iniciado_em ?? "");
    if (Number.isFinite(inicio) && Date.now() - inicio < 15 * 60000) {
      return { estado: "processando", mensagem: "O envio ao YouTube está em andamento." };
    }
    const erro = "O envio ao YouTube foi interrompido. Confira no YouTube Studio se o vídeo subiu antes de tentar de novo.";
    await salvar(db, id, "youtube", "erro", { erro });
    return { estado: "erro", mensagem: erro };
  }

  try {
    if (!pub.video_path) throw new Error("Esta publicação não tem vídeo.");
    const titulo = pub.textos.youtube?.titulo?.trim();
    if (!titulo) throw new Error("Falta o título do YouTube.");
    const { data: con } = await db.from("redes_conexoes").select("token").eq("rede", "youtube").maybeSingle();
    if (!con) throw new Error("O YouTube ainda não está conectado. Conecte no topo da página.");

    const acesso = await yt.tokenDeAcesso(con.token as string);
    const video = await baixar(db, pub.video_path);
    await salvar(db, id, "youtube", "processando", { iniciado_em: new Date().toISOString() });

    const envio = await yt.enviarVideo(acesso, video.dados, {
      titulo,
      descricao: pub.textos.youtube?.legenda ?? "",
      publico: true,
    });

    let aviso: string | undefined;
    if (envio.privacidade !== "public") {
      aviso = "O YouTube deixou o vídeo privado (projeto ainda sem auditoria). Mude a visibilidade no YouTube Studio.";
    }
    if (pub.capa_path) {
      try {
        const capa = await baixar(db, pub.capa_path);
        await yt.definirCapa(acesso, envio.id, capa.dados, capa.tipo);
      } catch (e) {
        aviso = `${aviso ? `${aviso} ` : ""}${e instanceof Error ? e.message : "Capa não aplicada."}`;
      }
    }
    await salvar(db, id, "youtube", "publicado", {
      media_id: envio.id,
      permalink: `https://youtu.be/${envio.id}`,
      publicado_em: new Date().toISOString(),
      aviso,
    });
    return { estado: "publicado", mensagem: aviso ?? "Publicado no YouTube." };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido.";
    await salvar(db, id, "youtube", "erro", { erro });
    return { estado: "erro", mensagem: erro };
  }
}

export async function executarRede(id: string, rede: RedeId, esperaMs: number): Promise<Resultado> {
  if (rede === "instagram") return executarInstagram(id, esperaMs);
  if (rede === "youtube") return executarYoutube(id);
  return { estado: "erro", mensagem: "Esta rede ainda não tem publicação automática." };
}
