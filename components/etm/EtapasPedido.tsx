import type { StatusPedido } from "@/lib/etm";

const ETAPAS = ["Recebido", "Produção", "Avaliação", "Aprovado", "Enviado"] as const;

/** Em qual etapa o pedido está; a correção volta a ser uma avaliação em andamento. */
function etapaAtual(status: StatusPedido): number {
  switch (status) {
    case "recebido": return 0;
    case "em_producao": return 1;
    case "em_avaliacao":
    case "correcao": return 2;
    case "aprovado": return 3;
    case "enviado": return 4;
    default: return -1;
  }
}

/** Faixa fina de 5 segmentos, para a lista. */
export function EtapasCompactas({ status }: { status: StatusPedido }) {
  const atual = etapaAtual(status);
  if (atual < 0) return null;
  return (
    <div className="flex gap-1" aria-label={`Etapa ${ETAPAS[atual]}`} role="img">
      {ETAPAS.map((nome, i) => (
        <span
          key={nome}
          className={`h-1.5 flex-1 rounded-full ${
            i < atual
              ? "bg-accent-strong"
              : i === atual
                ? status === "correcao"
                  ? "bg-orange-500"
                  : status === "em_avaliacao"
                    ? "bg-amber-500"
                    : "bg-accent-strong"
                : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

/** Linha do tempo completa de etapas, para a página do pedido. */
export default function EtapasPedido({ status }: { status: StatusPedido }) {
  const atual = etapaAtual(status);
  if (atual < 0) {
    return <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">Este pedido foi cancelado.</p>;
  }
  const alerta = status === "em_avaliacao" || status === "correcao";
  const finalizado = status === "enviado";

  return (
    <ol className="flex items-start" aria-label="Etapas do pedido">
      {ETAPAS.map((nome, i) => {
        const feita = i < atual || finalizado;
        const aqui = i === atual && !finalizado;
        return (
          <li key={nome} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= atual ? "bg-accent-strong" : "bg-slate-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                feita
                  ? "bg-accent-strong text-white"
                  : aqui
                    ? `${alerta ? (status === "correcao" ? "bg-orange-500" : "bg-amber-500") : "bg-accent-strong"} text-white ring-4 ${
                        alerta ? (status === "correcao" ? "ring-orange-200" : "ring-amber-200") : "ring-accent-strong/20"
                      }`
                    : "border-2 border-slate-200 bg-white text-slate-400"
              }`}
            >
              {feita ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`mt-2 text-[11px] font-semibold sm:text-xs ${aqui ? "text-fg" : feita ? "text-slate-600" : "text-slate-400"}`}>
              {aqui && status === "correcao" ? "Em correção" : nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
