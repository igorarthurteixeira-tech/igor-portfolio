export const BUCKET = "publicacoes";
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;

export type RedeId = "instagram" | "youtube" | "linkedin" | "tiktok";

export const REDES: { id: RedeId; nome: string; titulo: boolean; automatica: boolean }[] = [
  { id: "instagram", nome: "Instagram", titulo: false, automatica: true },
  { id: "youtube", nome: "YouTube", titulo: true, automatica: false },
  { id: "linkedin", nome: "LinkedIn", titulo: false, automatica: false },
  { id: "tiktok", nome: "TikTok", titulo: false, automatica: false },
];

export type StatusRede = "pendente" | "processando" | "publicado" | "erro";

export type Textos = Partial<Record<RedeId, { titulo?: string; legenda?: string }>>;

export type Detalhe = {
  container_id?: string;
  media_id?: string;
  permalink?: string | null;
  erro?: string;
  publicado_em?: string;
};

export type Publicacao = {
  id: string;
  titulo: string;
  textos: Textos;
  redes: RedeId[];
  agendada_em: string | null;
  video_path: string | null;
  capa_path: string | null;
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
