import { randomUUID } from "crypto";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import {
  BUCKET_ETM,
  EXT_ETM,
  TIPOS_PADRAO,
  chaveTipo,
  normalizarTipo,
  outroPorUltimo,
  type TipoVideo,
  LIMITE_ARQUIVO_ETM,
  LIMITE_DRIVE_ETM,
  MAX_ARQUIVOS_ETM,
  MIME_ETM,
  megas,
  type Arquivo,
  type ArquivoEnviado,
  type Evento,
  type Pedido,
  type ResumoPedido,
  type SituacaoEtm,
} from "@/lib/etm";
import { acessoDrive, acharEnvio, driveConectado, iniciarSessao } from "@/lib/drive";
import type { Preparo } from "@/lib/etm-upload";

export type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;
export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

export const limpar = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

/** Aceita só endereços http(s); devolve "" se vazio e null se inválido. */
export function linkValido(s: unknown): string | null {
  const v = limpar(s, 500);
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const mensagemDe = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);

/** Maior arquivo aceito agora: o do Drive, se estiver conectado; senão o do Supabase. */
export async function limiteDeEnvio(db: Db) {
  return (await driveConectado(db)) ? LIMITE_DRIVE_ETM : LIMITE_ARQUIVO_ETM;
}

/**
 * Prepara o envio de um arquivo. Com o Google Drive conectado, abre uma sessão de envio em partes na pasta do pedido;
 * sem ele, cria o endereço de envio direto para o bucket privado do Supabase (limite de 50 MB).
 */
export async function prepararUpload(pedidoId: string, nome: string, tamanho: number): Promise<Preparo> {
  if (!ehUuid(pedidoId)) return { ok: false, erro: "Pedido inválido." };
  if (!(tamanho > 0)) return { ok: false, erro: "Arquivo vazio." };
  const ext = (nome.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!EXT_ETM.includes(ext)) return { ok: false, erro: `Tipo de arquivo não aceito (.${ext || "?"}).` };
  const db = supabaseAdmin();
  if (!db) return { ok: false, erro: "Supabase não configurado." };

  let acesso: string | null;
  try {
    acesso = await acessoDrive(db);
  } catch (e) {
    return { ok: false, erro: mensagemDe(e, "O Google Drive está indisponível.") };
  }

  if (acesso) {
    if (tamanho > LIMITE_DRIVE_ETM) return { ok: false, erro: `Arquivo acima de ${megas(LIMITE_DRIVE_ETM)} MB.` };
    try {
      const uploadId = randomUUID();
      const sessao = await iniciarSessao(db, acesso, {
        pedidoId,
        uploadId,
        nome: limpar(nome, 150) || `arquivo.${ext}`,
        tipo: MIME_ETM[ext] ?? "application/octet-stream",
        tamanho,
      });
      return { ok: true, modo: "drive", sessao, path: `drive-upload:${uploadId}` };
    } catch (e) {
      return { ok: false, erro: mensagemDe(e, "Não foi possível preparar o envio ao Google Drive.") };
    }
  }

  if (tamanho > LIMITE_ARQUIVO_ETM) return { ok: false, erro: "Arquivo acima de 50 MB. Use o campo de link (Drive, OneDrive...)." };
  const path = `pedidos/${pedidoId}/${randomUUID()}.${ext}`;
  const { data, error } = await db.storage.from(BUCKET_ETM).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio." };
  return { ok: true, modo: "storage", path, token: data.token, bucket: BUCKET_ETM };
}

/**
 * Confere os arquivos enviados. Os do Supabase precisam estar na pasta do pedido; os do Drive são achados no
 * próprio Drive pelo código do envio, então o navegador nunca consegue apontar para um arquivo alheio.
 */
export async function validarArquivos(pedidoId: string, arquivos: unknown): Promise<ArquivoEnviado[] | string> {
  if (!Array.isArray(arquivos)) return "Arquivos inválidos.";
  if (arquivos.length > MAX_ARQUIVOS_ETM) return `No máximo ${MAX_ARQUIVOS_ETM} arquivos por vez.`;
  const prefixo = new RegExp(`^pedidos/${pedidoId}/[0-9a-f-]{36}\\.[a-z0-9]{1,5}$`);
  const saida: ArquivoEnviado[] = [];
  let acesso: string | null = null;
  for (const a of arquivos) {
    const path = String(a?.path ?? "");
    const drive = /^drive-upload:([0-9a-f-]{36})$/.exec(path);
    if (drive) {
      if (!ehUuid(drive[1]) || !ehUuid(pedidoId)) return "Arquivo inválido.";
      const db = supabaseAdmin();
      if (!db) return "Serviço indisponível.";
      try {
        acesso ??= await acessoDrive(db);
        if (!acesso) return "O Google Drive não está conectado.";
        const f = await acharEnvio(acesso, pedidoId, drive[1]);
        if (!f) return "Não encontrei o arquivo no Google Drive. Envie de novo.";
        saida.push({ path: `drive:${f.id}`, nome: limpar(a?.nome, 200) || f.nome, tamanho: f.tamanho });
      } catch (e) {
        return mensagemDe(e, "Não foi possível conferir o arquivo no Google Drive.");
      }
      continue;
    }
    if (!prefixo.test(path)) return "Arquivo inválido.";
    saida.push({
      path,
      nome: limpar(a?.nome, 200) || "arquivo",
      tamanho: Math.max(0, Math.min(Number(a?.tamanho) || 0, LIMITE_ARQUIVO_ETM)),
    });
  }
  return saida;
}

export async function criarEvento(
  db: Db,
  e: Pick<Evento, "autor" | "autor_nome" | "tipo"> &
    Partial<Pick<Evento, "texto" | "status_novo" | "versao" | "link" | "responde_a" | "autor_id">> & { pedido_id: string },
): Promise<string | null> {
  const { data, error } = await db
    .from("etm_eventos")
    .insert({
      pedido_id: e.pedido_id,
      autor: e.autor,
      autor_nome: e.autor_nome,
      tipo: e.tipo,
      texto: e.texto ?? "",
      status_novo: e.status_novo ?? null,
      versao: e.versao ?? null,
      link: e.link || null,
      responde_a: e.responde_a ?? null,
      autor_id: e.autor_id ?? null,
    })
    .select("id")
    .single();
  return error || !data ? null : (data.id as string);
}

export async function registrarArquivos(
  db: Db,
  pedidoId: string,
  eventoId: string | null,
  papel: "material" | "entrega" | "anexo",
  arquivos: ArquivoEnviado[],
) {
  if (arquivos.length === 0) return;
  await db.from("etm_arquivos").insert(
    arquivos.map((a) => ({
      pedido_id: pedidoId,
      evento_id: eventoId,
      papel,
      caminho: a.path,
      nome: a.nome,
      tamanho: a.tamanho,
    })),
  );
}

export async function atualizarPedido(db: Db, id: string, campos: Record<string, unknown> = {}) {
  await db
    .from("etm_pedidos")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id);
}

export type ArquivoComUrl = Arquivo & { url: string | null; urlBaixar: string | null };

/**
 * O que quem produz mandou (versões entregues e anexos dele) só pode ser baixado depois da aprovação:
 * antes disso, quem não é o painel não recebe o link de download.
 * Pedido com a linha do tempo e os arquivos já com link (assinado por 1 hora no Supabase, ou rota protegida no Drive). */
export async function carregarDetalhe(db: Db, id: string, admin = false) {
  if (!ehUuid(id)) return null;
  const [{ data: pedido }, { data: eventos }, { data: arquivos }] = await Promise.all([
    db.from("etm_pedidos").select("*").eq("id", id).maybeSingle(),
    db.from("etm_eventos").select("*").eq("pedido_id", id).order("criado_em", { ascending: true }),
    db.from("etm_arquivos").select("*").eq("pedido_id", id).order("criado_em", { ascending: true }),
  ]);
  if (!pedido) return null;

  const lista = (arquivos ?? []) as Arquivo[];
  const noDrive = (a: Arquivo) => a.caminho.startsWith("drive:");
  const urls = new Map<string, string>();
  const autorDoEvento = new Map((eventos ?? []).map((e) => [e.id as string, e.autor as string]));
  const status = (pedido as Pedido).status;
  const liberado = status === "aprovado" || status === "enviado";
  const baixarBloqueado = (a: Arquivo) =>
    !admin && !liberado && (a.papel === "entrega" || autorDoEvento.get(a.evento_id ?? "") === "igor");
  const doStorage = lista.filter((a) => !noDrive(a));
  if (doStorage.length) {
    const { data } = await db.storage.from(BUCKET_ETM).createSignedUrls(doStorage.map((a) => a.caminho), 3600);
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl);
  }
  return {
    pedido: pedido as Pedido,
    eventos: (eventos ?? []) as Evento[],
    arquivos: lista.map((a) => {
      // arquivos do Drive passam por uma rota do próprio site, que confere o login antes de entregar
      const bloqueado = baixarBloqueado(a);
      if (noDrive(a)) return { ...a, url: `/api/etm/arquivo/${a.id}`, urlBaixar: bloqueado ? null : `/api/etm/arquivo/${a.id}?baixar=1` };
      const url = urls.get(a.caminho) ?? null;
      return { ...a, url, urlBaixar: url && !bloqueado ? `${url}&download=${encodeURIComponent(a.nome)}` : null };
    }) as ArquivoComUrl[],
  };
}

/** Pessoa da ETM logada e aprovada, ou o dono do painel (que também entra aqui); senão null. */
export const getEtmUser = cache(async () => {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const dono = process.env.ADMIN_EMAIL?.toLowerCase();
  if (dono && user.email?.toLowerCase() === dono) {
    return { id: user.id, email: user.email ?? "", nome: "Igor", admin: true };
  }
  const db = supabaseAdmin();
  if (!db) return null;
  const { data: u } = await db.from("etm_usuarios").select("nome,situacao").eq("user_id", user.id).maybeSingle();
  if (u?.situacao !== "aprovado") return null;
  return { id: user.id, email: user.email ?? "", nome: u.nome as string, admin: false };
});

/** Situação do cadastro de quem acabou de entrar (para explicar por que o acesso não abriu). */
export async function situacaoEtm(userId: string) {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("etm_usuarios").select("situacao").eq("user_id", userId).maybeSingle();
  return (data?.situacao as SituacaoEtm | undefined) ?? null;
}

/** Arquivos, versões entregues e a última movimentação de cada pedido, para os cartões do feed. */
export async function carregarResumos(db: Db, ids: string[]) {
  const mapa = new Map<string, ResumoPedido>();
  if (ids.length === 0) return mapa;
  const [{ data: eventos }, { data: arquivos }] = await Promise.all([
    db
      .from("etm_eventos")
      .select("id,pedido_id,tipo,autor_nome,texto,criado_em,responde_a")
      .in("pedido_id", ids)
      .order("criado_em", { ascending: false })
      .limit(3000),
    db.from("etm_arquivos").select("pedido_id").in("pedido_id", ids).limit(6000),
  ]);
  const obter = (id: string) => {
    let r = mapa.get(id);
    if (!r) mapa.set(id, (r = { arquivos: 0, versoes: 0, perguntasAbertas: 0, ultimo: null }));
    return r;
  };
  const perguntas = new Map<string, string[]>();
  const respondidas = new Set<string>();
  for (const e of eventos ?? []) {
    const r = obter(e.pedido_id as string);
    if (e.tipo === "entrega") r.versoes += 1;
    if (e.tipo === "duvida") perguntas.set(e.pedido_id as string, [...(perguntas.get(e.pedido_id as string) ?? []), e.id as string]);
    if (e.tipo === "resposta" && e.responde_a) respondidas.add(e.responde_a as string);
    // mais recente primeiro: o primeiro que não for a criação é a última movimentação
    if (!r.ultimo && e.tipo !== "criado") {
      r.ultimo = { autor_nome: e.autor_nome, tipo: e.tipo, texto: e.texto, criado_em: e.criado_em };
    }
  }
  for (const a of arquivos ?? []) obter(a.pedido_id as string).arquivos += 1;
  for (const [pedidoId, ids] of perguntas) obter(pedidoId).perguntasAbertas = ids.filter((i) => !respondidas.has(i)).length;
  return mapa;
}

/** Tipos de pedido que aparecem no formulário (os ocultos ficam de fora); "Outro" sempre por último. */
export async function tiposAtivos(db: Db): Promise<TipoVideo[]> {
  const { data, error } = await db.from("etm_tipos").select("rotulo,descricao").eq("ativo", true).order("criado_em").order("rotulo");
  if (error || !data?.length) return TIPOS_PADRAO;
  return outroPorUltimo(data.map((t) => ({ rotulo: t.rotulo as string, descricao: (t.descricao as string) ?? "" })));
}

/** Devolve o nome do tipo; se for novo, cria com a descrição. Nomes que só diferem em maiúscula ou acento são o mesmo tipo. */
export async function garantirTipo(db: Db, bruto: string, descricao = "") {
  const nome = normalizarTipo(bruto);
  if (nome.length < 2) return null;
  const { data } = await db.from("etm_tipos").select("rotulo");
  const existente = (data ?? []).find((t) => chaveTipo(t.rotulo as string) === chaveTipo(nome));
  if (existente) return existente.rotulo as string;
  const { error } = await db.from("etm_tipos").insert({ rotulo: nome, descricao: limpar(descricao, 200) });
  return error ? null : nome;
}
