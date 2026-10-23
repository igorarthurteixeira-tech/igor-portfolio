export const BUCKET = "publicacoes";
/** Imagens das séries (capa da série e de cada episódio): bucket público, o site as exibe. */
export const BUCKET_SERIES = "series";
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;

export type RedeId = "instagram" | "youtube" | "linkedin" | "tiktok";

export const REDES: { id: RedeId; nome: string; titulo: boolean; automatica: boolean }[] = [
  { id: "instagram", nome: "Instagram", titulo: false, automatica: true },
  { id: "youtube", nome: "YouTube", titulo: true, automatica: true },
  { id: "linkedin", nome: "LinkedIn", titulo: false, automatica: true },
  { id: "tiktok", nome: "TikTok", titulo: false, automatica: false },
];

/** Formatos recomendados (orientação para quem prepara o arquivo; o painel não converte nada). */
export const FORMATOS: Record<RedeId, { video: string; capa: string }> = {
  instagram: {
    video: "Vertical 9:16, 1080×1920, MP4 (H.264), até 90 s",
    capa: "Vertical 9:16, 1080×1920. No perfil ela aparece cortada em 4:5, então mantenha o essencial no centro",
  },
  youtube: {
    video: "Vertical 9:16, 1080×1920, MP4, até 3 min (vira Short). Horizontal 16:9 vira vídeo comum",
    capa: "Horizontal 16:9, 1280×720, JPG ou PNG, até 2 MB. Em Shorts ela só vale no perfil e na busca",
  },
  linkedin: {
    video: "Vertical 4:5, 1080×1350, MP4. Ocupa mais espaço no feed que o 9:16",
    capa: "4:5, 1080×1350",
  },
  tiktok: {
    video: "Vertical 9:16, 1080×1920, MP4, até 60 s",
    capa: "Vertical 9:16, 1080×1920",
  },
};

/** O que o formulário envia sobre a série do vídeo. `escolha` = slug de uma série existente ou "nova". */
export type SerieEnviada = {
  escolha: string;
  numero: number;
  epTitulo: string;
  resumo: string;
  duracao: string;
  nome: string;
  chamada: string;
  descricao: string;
};

export type StatusRede = "pendente" | "processando" | "publicado" | "erro";

export type Textos = Partial<Record<RedeId, { titulo?: string; legenda?: string }>>;

export type Detalhe = {
  container_id?: string;
  media_id?: string;
  permalink?: string | null;
  erro?: string;
  publicado_em?: string;
  /** Momento em que um envio sem volta (YouTube) começou; evita enviar duas vezes. */
  iniciado_em?: string;
  /** Observação não fatal (ex.: o YouTube deixou o vídeo privado). */
  aviso?: string;
};

export type Publicacao = {
  id: string;
  titulo: string;
  textos: Textos;
  redes: RedeId[];
  agendada_em: string | null;
  video_path: string | null;
  capa_path: string | null;
  /** Episódio da série que este vídeo representa (ex.: "expediente:1"). */
  episodio: string | null;
  status_redes: Partial<Record<RedeId, StatusRede>>;
  detalhes_redes: Partial<Record<RedeId, Detalhe>>;
  criado_em: string;
};

export type Conexao = { rede: RedeId; conta_nome: string | null; expira_em: string | null };

export const idsRedes = new Set<string>(REDES.map((r) => r.id));

/** Data/hora de Brasília para exibição. */
export function quando(iso: string | null) {
  if (!iso) return "Sem data";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valor de <input type="datetime-local"> (horário de Brasília) para ISO. */
export function localParaIso(valor: string) {
  if (!valor) return null;
  const d = new Date(`${valor}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function concluida(p: Publicacao) {
  return p.redes.length > 0 && p.redes.every((r) => p.status_redes[r] === "publicado");
}

export function diasRestantes(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
}

/** ISO para o valor de <input type="datetime-local"> no horário de Brasília. */
export function isoParaLocal(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

export type Situacao = "atencao" | "agendada" | "sem-data" | "concluida";

/** Em que grupo a publicação aparece no painel. */
export function situacao(p: Publicacao): Situacao {
  if (concluida(p)) return "concluida";
  const estados = p.redes.map((r) => p.status_redes[r]);
  const atrasada = !!p.agendada_em && Date.parse(p.agendada_em) < Date.now() && estados.includes("pendente");
  if (estados.includes("erro") || atrasada) return "atencao";
  return p.agendada_em ? "agendada" : "sem-data";
}

/** "em 2 h", "em 1 d", "há 15 min": distância até a data, para leitura rápida. */
export function relativo(iso: string | null) {
  if (!iso) return null;
  const min = Math.round((Date.parse(iso) - Date.now()) / 60000);
  const abs = Math.abs(min);
  const texto = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`;
  return min >= 0 ? `em ${texto}` : `há ${texto}`;
}

export type EstadoPonto = "publicado" | "parcial" | "agendada" | "atencao" | "sem-data";
export type Ponto = { p: Publicacao; estado: EstadoPonto; quando: string | null };

/** Quando o item aparece na linha do tempo: a primeira publicação feita, ou o agendamento. */
function quandoDoPonto(p: Publicacao): { quando: string | null; algumaPublicada: boolean } {
  const feitas = p.redes
    .filter((r) => p.status_redes[r] === "publicado")
    .map((r) => p.detalhes_redes?.[r]?.publicado_em)
    .filter((d): d is string => !!d)
    .sort();
  const algumaPublicada = p.redes.some((r) => p.status_redes[r] === "publicado");
  return { quando: feitas[0] ?? p.agendada_em, algumaPublicada };
}

/** Separa as publicações em: o que já saiu, o que vem pela frente (em relação a agora) e o que não tem data. */
export function linhaDoTempo(pubs: Publicacao[]) {
  const agora = Date.now();
  const pontos: Ponto[] = pubs.map((p) => {
    const { quando, algumaPublicada } = quandoDoPonto(p);
    const estados = p.redes.map((r) => p.status_redes[r]);
    const atrasada = !!p.agendada_em && Date.parse(p.agendada_em) < agora && estados.includes("pendente");
    let estado: EstadoPonto;
    if (concluida(p)) estado = "publicado";
    else if (algumaPublicada) estado = "parcial";
    else if (estados.includes("erro") || atrasada) estado = "atencao";
    else estado = p.agendada_em ? "agendada" : "sem-data";
    return { p, estado, quando };
  });
  const comData = pontos.filter((x) => x.quando).sort((a, b) => Date.parse(a.quando!) - Date.parse(b.quando!));
  return {
    passado: comData.filter((x) => Date.parse(x.quando!) <= agora),
    futuro: comData.filter((x) => Date.parse(x.quando!) > agora),
    semData: pontos.filter((x) => !x.quando),
  };
}

/** "23/10", no fuso de Brasília. */
export function hojeBR() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}
