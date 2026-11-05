import type { MarcaDuvida, Pedido, Visao } from "@/lib/etm";
import { SeloStatus } from "./DetalhePedido";
import EtapasPedido from "./EtapasPedido";

/**
 * Cartão com o número, o título, o status e as etapas do pedido. Fica sempre no topo e fixo ao rolar a página.
 * `marcas` mostram na linha as perguntas do pedido: em aberto (parada) ou respondidas (verde).
 * `topo` é a distância até as barras fixas do site (classe do Tailwind, escrita por inteiro em quem usa).
 */
export default function CabecalhoPedido({
  pedido,
  topo,
  marcas = [],
  visao = "etm",
}: {
  pedido: Pedido;
  topo: string;
  marcas?: MarcaDuvida[];
  visao?: Visao;
}) {
  return (
    <div className={`sticky z-30 ${topo}`}>
      <div className="card px-4 py-3 shadow-lg shadow-slate-900/10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold text-muted">Pedido #{pedido.numero}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-bold text-fg">{pedido.titulo}</span>
          </p>
          <span className="flex items-center gap-2">
            {pedido.urgente && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">Urgente</span>}
            <SeloStatus status={pedido.status} visao={visao} />
          </span>
        </div>
        <div className="mt-2">
          <EtapasPedido status={pedido.status} compacto marcas={marcas} cobranca={pedido.cobranca_status} />
        </div>
      </div>
    </div>
  );
}
