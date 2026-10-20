"use client";

import { useState } from "react";
import { brl } from "@/lib/showroom-store";

const PRAZOS = [12, 24, 36, 48, 60];
const TAXA_MENSAL = 0.0149; // ilustrativa

/** Simulação de financiamento pela tabela Price. Valores ilustrativos. */
export default function Simulador({ preco }: { preco: number }) {
  const [entradaPct, setEntradaPct] = useState(30);
  const [prazo, setPrazo] = useState(48);

  const entrada = Math.round((preco * entradaPct) / 100);
  const financiado = preco - entrada;
  const parcela =
    financiado <= 0
      ? 0
      : (financiado * TAXA_MENSAL) / (1 - Math.pow(1 + TAXA_MENSAL, -prazo));
  const total = parcela * prazo + entrada;

  return (
    <section className="card p-6" aria-labelledby="sim-titulo">
      <h2 id="sim-titulo" className="text-xl font-semibold tracking-tight text-fg">
        Simule o financiamento
      </h2>
      <p className="mt-1 text-sm text-muted">Valores ilustrativos, com taxa de {(TAXA_MENSAL * 100).toFixed(2).replace(".", ",")}% ao mês.</p>

      <div className="mt-6 space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="entrada" className="text-sm font-semibold text-fg">Entrada</label>
            <span className="text-sm font-semibold text-accent-strong">
              {brl(entrada)} ({entradaPct}%)
            </span>
          </div>
          <input id="entrada" type="range" min={0} max={70} step={5} value={entradaPct} onChange={(e) => setEntradaPct(Number(e.target.value))} className="w-full accent-[var(--color-accent-strong)]" />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-fg">Prazo</p>
          <div className="flex flex-wrap gap-2">
            {PRAZOS.map((p) => (
              <button
                key={p}
                onClick={() => setPrazo(p)}
                aria-pressed={prazo === p}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  prazo === p ? "border-accent-strong bg-accent-strong text-white" : "border-line bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {p}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-brand p-5 text-white">
        <p className="text-sm text-slate-300">Parcela estimada</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {prazo}x de {brl(Math.round(parcela))}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
          <div>
            <dt className="text-slate-400">Valor financiado</dt>
            <dd className="font-semibold">{brl(financiado)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Total pago</dt>
            <dd className="font-semibold">{brl(Math.round(total))}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
