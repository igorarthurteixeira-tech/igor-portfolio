export const BUCKET_ETM = "etm";
export const LIMITE_ARQUIVO_ETM = 50 * 1024 * 1024;
export const MAX_ARQUIVOS_ETM = 10;
/** Com o Google Drive conectado, o limite por arquivo deixa de ser o do Supabase. */
export const LIMITE_DRIVE_ETM = 500 * 1024 * 1024;
export const EXT_ETM = ["jpg", "jpeg", "png", "webp", "heic", "mp4", "mov", "m4v", "zip", "pdf"];

/** Tipos de pedido que existem desde o início; a lista de verdade fica no banco (etm_tipos) e a ETM pode criar novos. */
export type TipoVideo = { rotulo: string; descricao: string };

export const TIPOS_PADRAO: TipoVideo[] = [
  { rotulo: "Vídeo", descricao: "Vídeo editado a partir de fotos, imagens e gravações. Ex.: recap de evento, institucional, depoimento." },
  { rotulo: "Carrossel", descricao: "Sequência de imagens para deslizar nas redes sociais, com uma ideia por imagem." },
  { rotulo: "Imagem / arte", descricao: "Uma peça gráfica única: post, capa, banner ou convite." },
  { rotulo: "Outro", descricao: "Qualquer pedido que não se encaixe nos tipos acima. Explique o que precisa na descrição do pedido." },
];

/** Coloca "Outro" por último e mantém o resto na ordem. */
export const outroPorUltimo = (lista: TipoVideo[]) => [
  ...lista.filter((t) => t.rotulo !== "Outro"),
  ...lista.filter((t) => t.rotulo === "Outro"),
];

// pedidos antigos guardavam um código em vez do nome do tipo
const TIPO_ANTIGO: Record<string, string> = {
  recap: "Vídeo",
  carrossel: "Carrossel",
  institucional: "Vídeo",
  depoimento: "Vídeo",
  outro: "Outro",
};
export const rotuloTipo = (tipo: string) => TIPO_ANTIGO[tipo] ?? tipo;

/** Nome de tipo arrumado: sem espaços sobrando, até 40 letras e a primeira maiúscula. */
export function normalizarTipo(s: string) {
  const limpo = s.replace(/\s+/g, " ").trim().slice(0, 40);
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/** Chave para saber se dois nomes de tipo são o mesmo (ignora maiúsculas e acentos). */
export const chaveTipo = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type StatusPedido = "recebido" | "em_producao" | "em_avaliacao" | "correcao" | "aprovado" | "enviado" | "cancelado";

export const STATUS: Record<StatusPedido, { rotulo: string; dica: string; cor: string }> = {
  recebido: { rotulo: "Recebido", dica: "Aguardando o início da produção.", cor: "bg-slate-100 text-slate-700" },
  em_producao: { rotulo: "Em produção", dica: "O vídeo está sendo feito.", cor: "bg-blue-100 text-blue-800" },
  em_avaliacao: { rotulo: "Aguardando sua avaliação", dica: "Há uma versão pronta para ser avaliada.", cor: "bg-amber-100 text-amber-800" },
  correcao: { rotulo: "Em correção", dica: "Os ajustes pedidos estão sendo feitos.", cor: "bg-orange-100 text-orange-800" },
  aprovado: { rotulo: "Aprovado", dica: "Aprovado, falta o envio final.", cor: "bg-emerald-100 text-emerald-800" },
  enviado: { rotulo: "Enviado", dica: "Entrega final concluída.", cor: "bg-emerald-200 text-emerald-900" },
  cancelado: { rotulo: "Cancelado", dica: "Pedido cancelado.", cor: "bg-slate-200 text-slate-600" },
};

export const ORDEM_STATUS = Object.keys(STATUS) as StatusPedido[];

export type Pedido = {
  id: string;
  numero: number;
  solicitante_id: string | null;
  solicitante_nome: string;
  titulo: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  urgente: boolean;
  link_material: string | null;
  status: StatusPedido;
  criado_em: string;
  atualizado_em: string;
};

export type Evento = {
  id: string;
  pedido_id: string;
  autor: "etm" | "igor";
  autor_nome: string;
  tipo: "criado" | "comentario" | "status" | "entrega" | "correcao" | "aprovacao" | "duvida" | "resposta";
  texto: string;
  status_novo: StatusPedido | null;
  versao: number | null;
  link: string | null;
  /** Numa resposta, o id da pergunta que ela responde. */
  responde_a: string | null;
  /** Quem escreveu (usuário do sistema); vazio nos registros antigos. */
  autor_id: string | null;
  editado_em: string | null;
  criado_em: string;
};

export type Arquivo = {
  id: string;
  pedido_id: string;
  evento_id: string | null;
  papel: "material" | "entrega" | "anexo";
  caminho: string;
  nome: string;
  tamanho: number;
  criado_em: string;
};

/** Arquivo já enviado ao Storage, a registrar no pedido. */
export type ArquivoEnviado = { path: string; nome: string; tamanho: number };

export type SituacaoEtm = "pendente" | "aprovado" | "bloqueado";

export type UsuarioEtm = { user_id: string; nome: string; email: string; situacao: SituacaoEtm; criado_em: string };

export function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2026-11-20" -> "20/11/2026" */
export function dataCurtaIso(d: string | null) {
  if (!d) return "Sem prazo";
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

export function tamanhoLegivel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EH_VIDEO = /\.(mp4|mov|m4v)$/i;
const EH_IMAGEM = /\.(jpe?g|png|webp)$/i;
export const ehVideo = (nome: string) => EH_VIDEO.test(nome);
export const ehImagem = (nome: string) => EH_IMAGEM.test(nome);
export const ehPdf = (nome: string) => /\.pdf$/i.test(nome);

const FUSO = "America/Sao_Paulo";

/** "2026-11-04", no horário de Brasília: chave para agrupar por dia. */
export const chaveDia = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date(iso));

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

/** "Hoje", "Ontem" ou "terça-feira, 03/11/2026". */
export function rotuloDia(iso: string) {
  const dia = chaveDia(iso);
  const agora = Date.now();
  if (dia === chaveDia(new Date(agora).toISOString())) return "Hoje";
  if (dia === chaveDia(new Date(agora - 86400000).toISOString())) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const ROTULO_EVENTO: Record<Evento["tipo"], string> = {
  criado: "Pedido criado",
  comentario: "Mensagem",
  status: "Status alterado",
  entrega: "Nova versão entregue",
  correcao: "Correção solicitada",
  aprovacao: "Vídeo aprovado",
  duvida: "Pergunta",
  resposta: "Resposta",
};

/** Perguntas que ainda não têm resposta (a resposta aponta para a pergunta em `responde_a`). */
export function perguntasAbertas(eventos: Evento[]) {
  const respondidas = new Set(eventos.filter((e) => e.tipo === "resposta").map((e) => e.responde_a));
  return eventos.filter((e) => e.tipo === "duvida" && !respondidas.has(e.id));
}

/** O que aparece no cartão do pedido além dos dados dele. */
export type ResumoPedido = {
  arquivos: number;
  versoes: number;
  /** Perguntas feitas à ETM que ainda não foram respondidas. */
  perguntasAbertas: number;
  ultimo: Pick<Evento, "autor_nome" | "tipo" | "texto" | "criado_em"> | null;
};

/** Filtros do feed, lidos da URL (?q=&g=&t=&p=). */
export type FiltrosFeed = { q: string; g: string; t: string; p: string };

const GRUPOS = ["acao", "andamento", "concluidos"];
const PERIODOS = ["hoje", "7", "30"];

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function lerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosFeed {
  const um = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const g = um("g");
  const t = um("t");
  const p = um("p");
  return {
    q: um("q").trim().slice(0, 80),
    g: GRUPOS.includes(g) ? g : "",
    t: t.trim().slice(0, 40),
    p: PERIODOS.includes(p) ? p : "",
  };
}

const FINAIS: StatusPedido[] = ["enviado", "cancelado"];

/** Quantos pedidos há em cada grupo, para os números dos botões. */
export function contarGrupos(pedidos: Pedido[], precisaAcao: StatusPedido[]) {
  return {
    todos: pedidos.length,
    acao: pedidos.filter((p) => precisaAcao.includes(p.status)).length,
    andamento: pedidos.filter((p) => !FINAIS.includes(p.status)).length,
    concluidos: pedidos.filter((p) => FINAIS.includes(p.status)).length,
  };
}

export function filtrarPedidos(pedidos: Pedido[], f: FiltrosFeed, precisaAcao: StatusPedido[]) {
  const busca = sem(f.q).replace(/^#/, "");
  const hoje = chaveDia(new Date().toISOString());
  return pedidos.filter((p) => {
    if (f.g === "acao" && !precisaAcao.includes(p.status)) return false;
    if (f.g === "andamento" && FINAIS.includes(p.status)) return false;
    if (f.g === "concluidos" && !FINAIS.includes(p.status)) return false;
    if (f.t && rotuloTipo(p.tipo) !== f.t) return false;
    if (f.p === "hoje" && chaveDia(p.criado_em) !== hoje) return false;
    if ((f.p === "7" || f.p === "30") && Date.now() - new Date(p.criado_em).getTime() > Number(f.p) * 86400000) return false;
    if (busca) {
      const palheiro = sem(`${p.numero} ${p.titulo} ${p.descricao} ${p.solicitante_nome}`);
      if (!palheiro.includes(busca)) return false;
    }
    return true;
  });
}

/** Código do vídeo se o endereço for do YouTube (watch, youtu.be, shorts, live ou embed); senão null. */
export function youtubeId(link: string | null) {
  if (!link) return null;
  try {
    const u = new URL(link);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const m = u.pathname.match(/^\/(?:shorts|live|embed)\/([^/?]+)/);
      id = m ? m[1] : u.pathname === "/watch" ? u.searchParams.get("v") : null;
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Tipo do arquivo pela extensão, para o player e o envio ao Drive. */
export const MIME_ETM: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  zip: "application/zip",
};

export const megas = (bytes: number) => Math.round(bytes / 1024 / 1024);

const EDITAVEIS: Evento["tipo"][] = ["comentario", "duvida", "resposta"];

/**
 * Quem pode mexer numa mensagem, pergunta ou resposta (os registros do fluxo, como "versão entregue", ficam de fora):
 * cada pessoa edita e exclui as próprias; o dono do painel também edita as dele (inclusive as antigas, sem `autor_id`)
 * e exclui qualquer uma.
 */
export function permissoesMensagem(
  e: Pick<Evento, "tipo" | "autor" | "autor_id">,
  quem?: { id: string; admin: boolean },
) {
  if (!quem || !EDITAVEIS.includes(e.tipo)) return { editar: false, excluir: false };
  const minha = e.autor_id === quem.id || (quem.admin && e.autor === "igor");
  return { editar: minha, excluir: minha || quem.admin };
}

/** Uma pergunta (ou mais) feita num trecho da linha de etapas: `etapa` é a etapa de onde o trecho sai (0 = Recebido). */
export type MarcaDuvida = { etapa: number; estado: "aberta" | "respondida" };

const ETAPA_DO_STATUS: Partial<Record<StatusPedido, number>> = {
  recebido: 0,
  em_producao: 1,
  em_avaliacao: 2,
  correcao: 2,
  aprovado: 3,
  enviado: 4,
};

/**
 * Onde cada pergunta fica na linha de etapas: na etapa em que o pedido estava quando ela foi feita
 * (lida do histórico, em ordem cronológica), e não onde o pedido está hoje. Assim a marca continua no
 * mesmo trecho depois que o pedido avança. Se houver mais de uma no trecho, basta uma aberta para ele ficar "aberta".
 */
export function marcasDeDuvida(eventos: Evento[]): MarcaDuvida[] {
  const respondidas = new Set(eventos.filter((e) => e.tipo === "resposta").map((e) => e.responde_a));
  const porEtapa = new Map<number, MarcaDuvida["estado"]>();
  let etapa = 0;
  for (const e of eventos) {
    if (e.status_novo && ETAPA_DO_STATUS[e.status_novo] !== undefined) etapa = ETAPA_DO_STATUS[e.status_novo] as number;
    // na última etapa não há trecho depois dela
    if (e.tipo === "duvida" && etapa < 4) {
      if (porEtapa.get(etapa) !== "aberta") porEtapa.set(etapa, respondidas.has(e.id) ? "respondida" : "aberta");
    }
  }
  return [...porEtapa].map(([et, estado]) => ({ etapa: et, estado }));
}

/** Quem está olhando: a ETM (quem pede e avalia) ou o painel (quem produz). Alguns status mudam de texto conforme a visão. */
export type Visao = "etm" | "igor";

export function rotuloStatus(status: StatusPedido, visao: Visao = "etm") {
  // quem avalia é o cliente: para o painel, o pedido "aguarda a avaliação do cliente", e não a sua
  if (visao === "igor" && status === "em_avaliacao") return "Aguardando avaliação do cliente";
  return STATUS[status].rotulo;
}

export function dicaStatus(status: StatusPedido, visao: Visao = "etm") {
  if (visao === "igor" && status === "em_avaliacao") return "A versão foi entregue e aguarda a avaliação do cliente.";
  return STATUS[status].dica;
}
