"use client";

import { useState } from "react";
import Link from "next/link";
import { brl, kmTxt, useCarro, useCarros } from "@/lib/showroom-store";
import SemFoto from "./SemFoto";
import CarroCard from "./CarroCard";
import Simulador from "./Simulador";
import FormInteresse from "./FormInteresse";

export default function DetalheCarro({ id }: { id: string }) {
  const carro = useCarro(id);
  const todos = useCarros();
  const [indice, setIndice] = useState(0);

  if (!carro) {
    return (
      <div className="card mx-auto max-w-xl p-12 text-center">
        <p className="text-xl font-semibold text-fg">Veículo não encontrado</p>
        <p className="mt-1 text-muted">Ele pode ter sido removido ou vendido.</p>
        <Link href="/showroom" className="btn-dark mt-6">Voltar à vitrine</Link>
      </div>
    );
  }

  const nome = `${carro.marca} ${carro.modelo}`;
  const fotos = carro.fotos ?? [];
  const itens: { chave: string; rotulo: string; fonte?: string }[] = fotos.length
    ? fotos.map((f, i) => ({ chave: `f${i}`, rotulo: `Foto ${i + 1}`, fonte: f }))
    : [{ chave: "sem", rotulo: "Foto em breve" }];
  const atual = itens[Math.min(indice, itens.length - 1)];
  const parecidos = todos.filter((c) => c.id !== carro.id && !c.vendido && (c.carroceria === carro.carroceria || c.marca === carro.marca)).slice(0, 3);

  const ficha: [string, string][] = [
    ["Ano", String(carro.ano)],
    ["Quilometragem", kmTxt(carro.km)],
    ["Câmbio", carro.cambio],
    ["Combustível", carro.combustivel],
    ["Cor", carro.cor.nome],
    ["Cidade", carro.cidade],
  ];

  return (
    <div>
      <nav aria-label="Navegação" className="mb-6 text-sm text-muted">
        <Link href="/showroom#estoque" className="font-medium text-accent-strong hover:underline">Estoque</Link>
        <span className="mx-2">/</span>
        <span>{nome}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <div className="card overflow-hidden">
            <div className="relative bg-slate-200">
              {atual.fonte ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={atual.fonte} alt={`${nome}, ${atual.rotulo}`} className="aspect-[16/10] w-full object-cover" />
              ) : (
                <SemFoto className="aspect-[16/10] w-full" />
              )}
              {carro.vendido && (
                <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">Vendido</span>
              )}
            </div>
            {itens.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-line bg-white p-3" role="tablist" aria-label="Galeria">
                {itens.map((it, i) => (
                  <button
                    key={it.chave}
                    role="tab"
                    aria-selected={i === indice}
                    onClick={() => setIndice(i)}
                    className={`shrink-0 overflow-hidden rounded border-2 bg-slate-100 transition ${i === indice ? "border-accent-strong" : "border-transparent opacity-70 hover:opacity-100"}`}
                    aria-label={it.rotulo}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.fonte} alt="" className="h-16 w-24 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card mt-6 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-fg">Sobre o veículo</h2>
            <p className="mt-3 leading-relaxed text-muted">{carro.descricao}</p>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Opcionais</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {carro.opcionais.map((o) => (
                <li key={o} className="flex items-center gap-2 text-sm text-fg">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l4 4 10-10" /></svg>
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">{carro.marca}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-fg">{carro.modelo}</h1>
            <p className="text-muted">{carro.versao}</p>
            <p className="mt-5 text-4xl font-bold tracking-tight text-fg">{brl(carro.preco)}</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5">
              {ficha.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="mt-0.5 flex items-center gap-2 font-semibold text-fg">
                    {k === "Cor" && <span className="h-3.5 w-3.5 rounded-full border border-slate-300" style={{ background: carro.cor.hex }} aria-hidden />}
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {carro.vendido ? (
            <div className="card p-6 text-center">
              <p className="font-semibold text-fg">Este veículo já foi vendido</p>
              <Link href="/showroom" className="btn-dark mt-4">Ver outros veículos</Link>
            </div>
          ) : (
            <>
              <Simulador preco={carro.preco} />
              <FormInteresse carroId={carro.id} nomeCarro={nome} />
            </>
          )}
        </div>
      </div>

      {parecidos.length > 0 && (
        <section className="mt-14" aria-labelledby="parecidos">
          <h2 id="parecidos" className="mb-5 text-2xl font-bold tracking-tight text-fg">Veículos parecidos</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {parecidos.map((c) => (<CarroCard key={c.id} carro={c} />))}
          </div>
        </section>
      )}
    </div>
  );
}
