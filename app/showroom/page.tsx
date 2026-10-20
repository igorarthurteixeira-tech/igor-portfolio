import type { Metadata } from "next";
import Link from "next/link";
import Vitrine from "@/components/showroom/Vitrine";
import HeroShowroom from "@/components/showroom/HeroShowroom";
import EmEstoque from "@/components/showroom/EmEstoque";
import { carrosDemo } from "@/lib/carros";

export const metadata: Metadata = {
  title: { absolute: "Vértice Motors | Seminovos selecionados" },
};

const beneficios = [
  { t: "Laudo cautelar", d: "Todos os carros passam por vistoria completa antes de entrar no estoque." },
  { t: "6 meses de garantia", d: "Cobertura de motor e câmbio, sem letra miúda." },
  { t: "Financiamento facilitado", d: "Simulação na hora e aprovação com os principais bancos." },
  { t: "Aceitamos o seu usado", d: "Avaliação justa e transparente na troca." },
];

const passos = [
  { n: "01", t: "Escolha o carro", d: "Navegue pelo estoque e filtre por marca, tipo e preço." },
  { n: "02", t: "Simule", d: "Na página do veículo, escolha entrada e prazo e veja a parcela." },
  { n: "03", t: "Fale com a gente", d: "Registre o interesse e um consultor entra em contato." },
  { n: "04", t: "Leve para casa", d: "Documentação resolvida e o carro entregue revisado." },
];

export default function ShowroomPage() {
  return (
    <>
      {/* HERO: palco 3D interativo */}
      <HeroShowroom>
        <p className="eyebrow-dark">Seminovos selecionados</p>
        <h1 className="text-5xl leading-[1.02] md:text-7xl">
          O carro certo,
          <br />
          <span className="text-accent">sem surpresa.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
          Estoque com procedência, laudo cautelar e garantia. Simule o financiamento na hora e fale com um consultor.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="#estoque" className="btn-primary">Ver o estoque</Link>
          <Link href="#financiamento" className="btn-ghost">Como financiar</Link>
        </div>
      </HeroShowroom>

      <EmEstoque />

      <div className="border-t border-white/10 bg-black text-white">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 md:grid-cols-4">
          {[
            [String(carrosDemo.length), "veículos em estoque"],
            ["6 meses", "de garantia"],
            ["até 60x", "no financiamento"],
            ["100%", "com laudo cautelar"],
          ].map(([v, r]) => (
            <div key={r} className="py-6 md:px-6 md:first:pl-0">
              <dd className="text-3xl font-semibold text-white" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>{v}</dd>
              <dt className="text-sm text-slate-400">{r}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* ESTOQUE */}
      <section id="estoque" className="scroll-mt-20 bg-page px-5 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="eyebrow">Estoque</p>
            <h2 className="text-4xl text-fg md:text-5xl">Nossos veículos</h2>
          </div>
          <Vitrine />
        </div>
      </section>

      {/* POR QUE A VÉRTICE */}
      <section className="bg-brand px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 text-3xl md:text-4xl">Por que comprar na Vértice</h2>
          <div className="grid gap-px overflow-hidden rounded-md bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {beneficios.map((b) => (
              <div key={b.t} className="bg-brand p-7">
                <span className="mb-4 block h-1 w-10 bg-accent-strong" />
                <h3 className="text-xl text-white">{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINANCIAMENTO */}
      <section id="financiamento" className="scroll-mt-20 bg-page-2 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">Financiamento</p>
          <h2 className="mb-10 text-4xl text-fg md:text-5xl">Do primeiro clique à chave na mão</h2>
          <ol className="grid gap-5 md:grid-cols-4">
            {passos.map((p) => (
              <li key={p.n} className="card p-6">
                <span className="text-4xl font-semibold text-accent-strong" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>{p.n}</span>
                <h3 className="mt-3 text-xl text-fg">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-start gap-4 rounded-md bg-brand p-8 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-2xl" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>Quer saber quanto fica a parcela?</p>
              <p className="mt-1 text-slate-400">Abra qualquer veículo e use o simulador. Sem compromisso.</p>
            </div>
            <Link href="#estoque" className="btn-primary shrink-0">Escolher um carro</Link>
          </div>
        </div>
      </section>
    </>
  );
}
