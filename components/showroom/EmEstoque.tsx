import Link from "next/link";
import { carrosDemo } from "@/lib/carros";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Faixa com os veículos do estoque, logo abaixo da hero. */
export default function EmEstoque() {
  const lista = carrosDemo.filter((c) => !c.vendido && c.fotos?.[0]);
  return (
    <section className="border-t border-white/10 bg-brand px-5 pb-10 pt-8 text-white" aria-labelledby="em-estoque">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="em-estoque" className="text-2xl md:text-3xl">Em estoque agora</h2>
          <Link href="#estoque" className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:text-white" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>
            Ver todos
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/showroom/${c.id}`} className="group block overflow-hidden rounded-md border border-white/10 bg-white/[0.04] transition hover:border-accent-strong">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.fotos![0]} alt={`${c.marca} ${c.modelo}`} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                <div className="p-3">
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-400">{c.marca}</p>
                  <p className="truncate text-lg text-white" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>{c.modelo}</p>
                  <p className="text-sm font-semibold text-accent-light">{brl(c.preco)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
