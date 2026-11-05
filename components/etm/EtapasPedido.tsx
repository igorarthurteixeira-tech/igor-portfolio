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

/**
 * Linha do tempo de etapas. `compacto` reduz o tamanho, para o cabeçalho fixo do pedido.
 * `bloqueado` (há pergunta sem resposta) pinta de amarelo o trecho até a próxima etapa e põe um "?" no meio dele:
 * o pedido não avança enquanto a pergunta não for respondida.
 */
export default function EtapasPedido({
  status,
  compacto = false,
  bloqueado = false,
}: {
  status: StatusPedido;
  compacto?: boolean;
  bloqueado?: boolean;
}) {
  const atual = etapaAtual(status);
  if (atual < 0) {
    return <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">Este pedido foi cancelado.</p>;
  }
  const alerta = status === "em_avaliacao" || status === "correcao";
  const finalizado = status === "enviado";
  const travado = bloqueado && !finalizado;
  const marca = compacto ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs";
  const bolinha = compacto ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  const linha = compacto ? "top-3" : "top-4";
  const icone = compacto ? "h-3 w-3" : "h-4 w-4";

  return (
    <ol className="flex items-start" aria-label="Etapas do pedido">
      {ETAPAS.map((nome, i) => {
        const feita = i < atual || finalizado;
        const aqui = i === atual && !finalizado;
        const trecho = travado && i === atual + 1;
        return (
          <li key={nome} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 ${linha} h-0.5 w-full -translate-y-1/2 ${
                  trecho ? "bg-amber-500" : i <= atual ? "bg-accent-strong" : "bg-slate-200"
                }`}
              />
            )}
            {trecho && (
              <span
                role="img"
                aria-label="Pedido parado: há uma pergunta sem resposta"
                title="Há uma pergunta aguardando resposta"
                className={`absolute left-0 ${linha} z-10 flex ${marca} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-500 font-bold text-white ring-4 ring-amber-200`}
              >
                ?
              </span>
            )}
            <span
              className={`relative z-10 flex ${bolinha} items-center justify-center rounded-full font-bold transition ${
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
                <svg viewBox="0 0 24 24" className={icone} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`${compacto ? "mt-1 text-[10px]" : "mt-2 text-[11px] sm:text-xs"} font-semibold ${aqui ? "text-fg" : feita ? "text-slate-600" : "text-slate-400"}`}
            >
              {aqui && status === "correcao" ? "Em correção" : nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
