"use client";

import { useEffect, useState } from "react";

/**
 * Só no celular/tablet: a hero começa com o texto grande; depois de uns
 * segundos o texto encolhe para o topo e os cartões dos projetos aparecem.
 * No computador nada disso acontece (as classes só valem abaixo de `lg`).
 */
export default function HeroFases({
  texto,
  vitrine,
  atraso = 2800,
}: {
  texto: React.ReactNode;
  vitrine: React.ReactNode;
  atraso?: number;
}) {
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const t = setTimeout(() => setCompacto(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);

  return (
    <div
      data-compacto={compacto}
      className="group/hero relative z-10 mx-auto grid w-full max-w-6xl items-center gap-0 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14"
    >
      <div className="text-center lg:text-left">{texto}</div>

      {/* cartões: entram suavemente quando o texto encolhe */}
      <div className="grid transition-[grid-template-rows,opacity] duration-700 ease-out max-lg:grid-rows-[0fr] max-lg:opacity-0 max-lg:group-data-[compacto=true]/hero:grid-rows-[1fr] max-lg:group-data-[compacto=true]/hero:opacity-100 lg:block">
        <div className="min-h-0 overflow-hidden px-1 pb-2 pt-6 lg:overflow-visible lg:p-0">
          {vitrine}
          <div className="mt-4 text-center lg:hidden">
            <button
              onClick={() => setCompacto(false)}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 underline underline-offset-4 transition hover:text-white"
            >
              Ver apresentação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
