"use client";

import type { FiltrosFeed as Filtros } from "@/lib/etm";

type Props = {
  valores: Filtros;
  onChange: (novo: Partial<Filtros>) => void;
  contagens: { todos: number; acao: number; andamento: number; concluidos: number };
  /** Tipos de pedido que existem nos pedidos, para o filtro. */
  tipos: string[];
  /** Texto do botão dos pedidos que esperam quem está olhando. */
  rotuloAcao: string;
};

const PERIODOS = [
  { id: "", rotulo: "Qualquer data" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7", rotulo: "Últimos 7 dias" },
  { id: "30", rotulo: "Últimos 30 dias" },
];

/** Barra de filtros do feed. Só mostra e devolve as escolhas: quem filtra é o componente que a usa, no navegador. */
export default function FiltrosFeed({ valores, onChange, contagens, rotuloAcao, tipos }: Props) {
  const grupos = [
    { id: "", rotulo: "Todos", n: contagens.todos },
    { id: "acao", rotulo: rotuloAcao, n: contagens.acao },
    { id: "andamento", rotulo: "Em andamento", n: contagens.andamento },
    { id: "concluidos", rotulo: "Concluídos", n: contagens.concluidos },
  ];
  const ativos = !!(valores.q || valores.g || valores.t || valores.p);

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        {grupos.map((g) => {
          const ativo = valores.g === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange({ g: g.id })}
              aria-pressed={ativo}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                ativo ? "bg-accent-strong text-white shadow-sm" : "bg-page text-slate-600 hover:bg-slate-200"
              }`}
            >
              {g.rotulo}
              <span className={`ml-1.5 text-xs ${ativo ? "text-white/80" : "text-slate-400"}`}>{g.n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={valores.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Buscar por título, descrição, pessoa ou número"
          aria-label="Buscar pedidos"
          className="field"
        />
        <select value={valores.t} onChange={(e) => onChange({ t: e.target.value })} aria-label="Tipo de pedido" className="field sm:w-52">
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={valores.p} onChange={(e) => onChange({ p: e.target.value })} aria-label="Período" className="field sm:w-44">
          {PERIODOS.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
      </div>

      {ativos && (
        <button
          type="button"
          onClick={() => onChange({ q: "", g: "", t: "", p: "" })}
          className="text-sm font-semibold text-accent-strong hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
