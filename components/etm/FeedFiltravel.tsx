"use client";

import { useMemo, useState } from "react";
import {
  contarGrupos,
  filtrarPedidos,
  rotuloTipo,
  type FiltrosFeed as Filtros,
  type Pedido,
  type ResumoPedido,
  type StatusPedido,
  type Visao,
} from "@/lib/etm";
import FeedPedidos from "./FeedPedidos";
import FiltrosFeed from "./FiltrosFeed";

type Props = {
  pedidos: Pedido[];
  resumos: Record<string, ResumoPedido>;
  base: string;
  precisaAcao: StatusPedido[];
  rotuloAcao: string;
  /** Filtros que vieram no endereço ao abrir a página. */
  inicial: Filtros;
  vazioSemFiltro: string;
  destacarPerguntas?: boolean;
  visao?: Visao;
};

/**
 * Feed com filtros que funcionam no navegador: a lista inteira chega uma vez e cada clique só filtra
 * o que já está na tela, sem consultar o servidor nem o banco. O endereço é atualizado sem recarregar,
 * para o link filtrado poder ser compartilhado.
 */
export default function FeedFiltravel({ pedidos, resumos, base, precisaAcao, rotuloAcao, inicial, vazioSemFiltro, destacarPerguntas, visao }: Props) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const contagens = useMemo(() => contarGrupos(pedidos, precisaAcao), [pedidos, precisaAcao]);
  const tipos = useMemo(() => [...new Set(pedidos.map((p) => rotuloTipo(p.tipo)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [pedidos]);
  const visiveis = useMemo(() => filtrarPedidos(pedidos, filtros, precisaAcao), [pedidos, filtros, precisaAcao]);
  const filtrando = !!(filtros.q || filtros.g || filtros.t || filtros.p);

  function mudar(novo: Partial<Filtros>) {
    const proximo = { ...filtros, ...novo };
    setFiltros(proximo);
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(proximo)) if (v.trim()) sp.set(k, v.trim());
    const url = sp.size ? `${window.location.pathname}?${sp}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <FiltrosFeed valores={filtros} onChange={mudar} contagens={contagens} rotuloAcao={rotuloAcao} tipos={tipos} />
      <FeedPedidos
        pedidos={visiveis}
        resumos={resumos}
        base={base}
        precisaAcao={precisaAcao}
        destacarPerguntas={destacarPerguntas}
        visao={visao}
        vazio={filtrando ? "Nenhum pedido com esses filtros." : vazioSemFiltro}
      />
    </div>
  );
}
