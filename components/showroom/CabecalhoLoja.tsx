"use client";

import { useState } from "react";
import Link from "next/link";
import Marca from "./Marca";

const links = [
  { href: "/showroom#estoque", rotulo: "Estoque" },
  { href: "/showroom#financiamento", rotulo: "Financiamento" },
  { href: "/showroom#loja", rotulo: "A loja" },
  { href: "/showroom#contato", rotulo: "Contato" },
];

export default function CabecalhoLoja() {
  const [aberto, setAberto] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link href="/showroom" aria-label="Vértice Motors, início" onClick={() => setAberto(false)}>
          <Marca />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:text-accent-strong"
              style={{ fontFamily: "var(--font-oswald), sans-serif" }}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <span className="text-sm text-slate-600">(00) 0000-0000</span>
          <Link href="/showroom/painel" className="btn-dark px-4! py-2!">Painel</Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded md:hidden"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {aberto && (
        <nav className="border-t border-line bg-white px-5 pb-4 md:hidden" aria-label="Principal">
          {[...links, { href: "/showroom/painel", rotulo: "Painel" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className="block border-b border-line py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700"
              style={{ fontFamily: "var(--font-oswald), sans-serif" }}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
