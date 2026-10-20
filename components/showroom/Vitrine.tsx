"use client";

import { useMemo, useState } from "react";
import { carrocerias, type Carroceria } from "@/lib/carros";
import { brl, useCarros } from "@/lib/showroom-store";
import CarroCard from "./CarroCard";

type Ordem = "destaque" | "menor-preco" | "maior-preco" | "mais-novo" | "menor-km";

const ordens: { id: Ordem; nome: string }[] = [
  { id: "destaque", nome: "Em destaque" },
  { id: "menor-preco", nome: "Menor preço" },
  { id: "maior-preco", nome: "Maior preço" },
  { id: "mais-novo", nome: "Mais novo" },
  { id: "menor-km", nome: "Menor quilometragem" },
];

export default function Vitrine() {
  const todos = useCarros();
  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState<Carroceria | "">("");
  const [maxPreco, setMaxPreco] = useState<number | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("destaque");
  const [soDisponiveis, setSoDisponiveis] = useState(false);

  const marcas = useMemo(() => [...new Set(todos.map((c) => c.marca))].sort(), [todos]);
  const teto = useMemo(() => Math.ceil(Math.max(100000, ...todos.map((c) => c.preco)) / 10000) * 10000, [todos]);
  const limite = Math.min(maxPreco ?? teto, teto);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const f = todos.filter((c) => {
      if (marca && c.marca !== marca) return false;
      if (tipo && c.carroceria !== tipo) return false;
      if (c.preco > limite) return false;
      if (soDisponiveis && c.vendido) return false;
      if (q && !`${c.marca} ${c.modelo} ${c.versao} ${c.cor.nome} ${c.combustivel}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const cmp: Record<Ordem, (a: (typeof f)[number], b: (typeof f)[number]) => number> = {
      destaque: (a, b) => Number(!!b.destaque) - Number(!!a.destaque),
      "menor-preco": (a, b) => a.preco - b.preco,
      "maior-preco": (a, b) => b.preco - a.preco,
      "mais-novo": (a, b) => b.ano - a.ano,
      "menor-km": (a, b) => a.km - b.km,
    };
    // vendidos sempre por último
    return [...f].sort((a, b) => Number(!!a.vendido) - Number(!!b.vendido) || cmp[ordem](a, b));
  }, [todos, busca, marca, tipo, limite, ordem, soDisponiveis]);

  const filtrando = !!(busca || marca || tipo || maxPreco !== null || soDisponiveis);
  const limpar = () => {
    setBusca(""); setMarca(""); setTipo(""); setMaxPreco(null); setSoDisponiveis(false); setOrdem("destaque");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="card h-fit space-y-6 p-5 lg:sticky lg:top-24">
        <div>
          <label htmlFor="busca" className="mb-2 block text-sm font-semibold text-fg">Buscar</label>
          <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Marca, modelo ou cor" className="field" />
        </div>

        <div>
          <label htmlFor="marca" className="mb-2 block text-sm font-semibold text-fg">Marca</label>
          <select id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="field">
            <option value="">Todas</option>
            {marcas.map((m) => (<option key={m}>{m}</option>))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-fg">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {carrocerias.filter((c) => todos.some((x) => x.carroceria === c.id)).map((c) => (
              <button
                key={c.id}
                onClick={() => setTipo(tipo === c.id ? "" : c.id)}
                aria-pressed={tipo === c.id}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  tipo === c.id ? "border-accent-strong bg-accent-strong text-white" : "border-line bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="preco" className="text-sm font-semibold text-fg">Preço até</label>
            <span className="text-sm font-semibold text-accent-strong">{brl(limite)}</span>
          </div>
          <input id="preco" type="range" min={40000} max={teto} step={5000} value={limite} onChange={(e) => setMaxPreco(Number(e.target.value))} className="w-full accent-[var(--color-accent-strong)]" />
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-fg">
          <input type="checkbox" checked={soDisponiveis} onChange={(e) => setSoDisponiveis(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent-strong)]" />
          Mostrar só disponíveis
        </label>

        {filtrando && (
          <button onClick={limpar} className="w-full rounded-lg border border-line py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Limpar filtros
          </button>
        )}
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            <strong className="text-fg">{lista.length}</strong> {lista.length === 1 ? "veículo encontrado" : "veículos encontrados"}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="ordem" className="text-sm text-muted">Ordenar por</label>
            <select id="ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="field !w-auto py-2">
              {ordens.map((o) => (<option key={o.id} value={o.id}>{o.nome}</option>))}
            </select>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg font-semibold text-fg">Nenhum veículo com esses filtros</p>
            <p className="mt-1 text-muted">Tente aumentar o preço ou remover algum filtro.</p>
            <button onClick={limpar} className="btn-dark mt-6">Limpar filtros</button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((c) => (<CarroCard key={c.id} carro={c} />))}
          </div>
        )}
      </div>
    </div>
  );
}
