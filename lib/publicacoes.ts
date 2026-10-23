export const BUCKET = "publicacoes";
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;

export type RedeId = "instagram" | "youtube" | "linkedin" | "tiktok";

export const REDES: { id: RedeId; nome: string; titulo: boolean; automatica: boolean }[] = [
  { id: "instagram", nome: "Instagram", titulo: false, automatica: true },
  { id: "youtube", nome: "YouTube", titulo: true, automatica: true },
  { id: "linkedin", nome: "LinkedIn", titulo: false, automatica: false },
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
