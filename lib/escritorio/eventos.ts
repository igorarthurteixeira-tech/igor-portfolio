// Eventos de uma rodada. São gravados pelo servidor no momento em que cada coisa acontece
// e depois "tocados" pelo escritório 3D: cada movimento dos agentes corresponde a um evento.


export const LIMITE_ALERTA = 0.05; // variação de 5% já vira aviso
export const INTERVALO_HORAS = 3; // coleta automática a cada 3 horas

export type Agente = "pesquisador" | "analista" | "comprador";

type Loja = { loja: string; vendedor: string; url: string };

export type Evento =
  | { tipo: "rodada_iniciada"; agente: "pesquisador"; dados: { origem: "agendada" | "manual"; produtos: number; ofertas: number } }
  | { tipo: "preco_coletado"; agente: "pesquisador"; produto_id: string; dados: Loja & { preco: number } }
  | { tipo: "sem_estoque"; agente: "pesquisador"; produto_id: string; dados: Loja & { preco: number | null } }
  | { tipo: "loja_falhou"; agente: "pesquisador"; produto_id: string; dados: { loja: string; motivo: string } }
  | { tipo: "entregou"; agente: "pesquisador"; dados: { precos: number; produtos: number } }
  | { tipo: "historico_consultado"; agente: "analista"; produto_id: string; dados: { coletas: number; anterior: number } }
  | { tipo: "sem_historico"; agente: "analista"; produto_id: string; dados: { preco: number; loja: string } }
  | { tipo: "sem_preco"; agente: "analista"; produto_id: string; dados: Record<string, never> }
  | { tipo: "comparou"; agente: "analista"; produto_id: string; dados: { preco: number; anterior: number; variacao: number; loja: string; vendedor: string } }
  | { tipo: "aviso_afixado"; agente: "comprador"; dados: { avisos: string[] } }
  | { tipo: "nada_a_avisar"; agente: "comprador"; dados: Record<string, never> }
  | { tipo: "rodada_concluida"; agente: "comprador"; dados: { duracao_ms: number } };

export type EventoGravado = Evento & { ordem: number; criado_em: string; produto_id?: string | null; funcionario_id?: string | null };

export type Rodada = {
  id: string;
  origem: "agendada" | "manual";
  fonte: string;
  simulada: boolean;
  iniciada_em: string;
  concluida_em: string | null;
};

/** Oferta vista na última coleta de cada produto (para a ficha do produto). */
export type OfertaAtual = {
  produto_id: string;
  loja: string;
  vendedor: string;
  preco: number | null;
  disponivel: boolean;
  url: string;
  imagem: string | null;
  coletado_em: string;
};

export const dinheiro = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 2 });

const pct = (v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(1).replace(".", ",")}%`;
const onde = (d: { loja: string; vendedor: string }) => (d.vendedor && d.vendedor !== d.loja ? `${d.loja} (vendido por ${d.vendedor})` : d.loja);

/** Texto curto de cada evento, usado no balão do agente e no diário. `nomeDoProduto` vem do catálogo carregado. */
export function descrever(e: Evento, nomeDoProduto: (id: string) => string = (id) => id): string {
  switch (e.tipo) {
    case "rodada_iniciada":
      return `Rodada ${e.dados.origem === "agendada" ? "agendada" : "pedida agora"}: ${e.dados.produtos} produtos em ${e.dados.ofertas} ofertas.`;
    case "preco_coletado":
      return `${nomeDoProduto(e.produto_id)}: ${dinheiro(e.dados.preco)} na ${onde(e.dados)}.`;
    case "sem_estoque":
      return `${nomeDoProduto(e.produto_id)}: sem estoque na ${onde(e.dados)}.`;
    case "loja_falhou":
      return `${nomeDoProduto(e.produto_id)}: a ${e.dados.loja} não respondeu (${e.dados.motivo}).`;
    case "entregou":
      return e.dados.precos
        ? `Entreguei ${e.dados.precos} preço${e.dados.precos > 1 ? "s" : ""} de ${e.dados.produtos} produto${e.dados.produtos > 1 ? "s" : ""} ao analista.`
        : "Voltei sem nenhum preço.";
    case "historico_consultado":
      return `${nomeDoProduto(e.produto_id)}: ${e.dados.coletas} coleta${e.dados.coletas > 1 ? "s" : ""} no arquivo, último melhor preço ${dinheiro(e.dados.anterior)}.`;
    case "sem_historico":
      return `${nomeDoProduto(e.produto_id)}: primeira coleta (${dinheiro(e.dados.preco)} na ${e.dados.loja}), nada para comparar.`;
    case "sem_preco":
      return `${nomeDoProduto(e.produto_id)}: nenhuma oferta disponível nesta rodada.`;
    case "comparou":
      return `${nomeDoProduto(e.produto_id)}: melhor preço ${dinheiro(e.dados.preco)} (${pct(e.dados.variacao)} sobre ${dinheiro(e.dados.anterior)}).`;
    case "aviso_afixado":
      return `Afixei ${e.dados.avisos.length} aviso${e.dados.avisos.length > 1 ? "s" : ""} no quadro.`;
    case "nada_a_avisar":
      return "Nenhuma mudança de 5% ou mais. Nada a avisar.";
    case "rodada_concluida":
      return `Rodada concluída em ${(e.dados.duracao_ms / 1000).toFixed(1).replace(".", ",")} s.`;
  }
}

/** Próximo horário de coleta automática (múltiplos de 3 h em UTC, como o agendador). */
export function proximaColeta(agora = new Date()): Date {
  const passo = INTERVALO_HORAS * 3600_000;
  return new Date(Math.floor(agora.getTime() / passo) * passo + passo);
}
