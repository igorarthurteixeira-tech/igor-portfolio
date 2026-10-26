import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { conteudos, dataCurta, resumoDaLegenda } from "@/lib/conteudos";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Conteúdos",
  description: "Carrosséis e análises publicados no Instagram, reunidos aqui.",
  alternates: { canonical: "/conteudos" },
};

export default async function ConteudosPage() {
  const itens = await conteudos();

  return (
    <div className="bg-page">
      <section className="relative isolate overflow-hidden bg-brand px-6 pb-20 pt-20 [clip-path:polygon(0_0,100%_0,100%_calc(100%-3rem),0_100%)]">
        <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-[120px]" />
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow-dark">Instagram</p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">Conteúdos</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-200">Os carrosséis que publico, reunidos aqui para ler com calma.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        {itens.length === 0 ? (
          <div className="card p-10 text-center text-muted">Em breve, os primeiros conteúdos.</div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((c) => (
              <li key={c.slug}>
                <Link href={`/conteudos/${c.slug}`} className="card card-hover group block overflow-hidden">
                  <div className="relative aspect-4/5 w-full bg-brand">
                    <Image
                      src={c.imagens[0]}
                      alt={`Capa de ${c.titulo}`}
                      fill
                      sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                      {c.imagens.length} slides
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">{dataCurta(c.publicadoEm)}</p>
                    <h2 className="mt-1 text-lg font-bold leading-snug text-fg">{c.titulo}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{resumoDaLegenda(c.legenda, 140)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
