"use client";

import { useEffect, useState } from "react";

/**
 * Só no celular/tablet: a hero começa com o texto todo, em ordem normal. Depois
 * de uns segundos o título encolhe e os cartões entram logo abaixo dele; a
 * apresentação (subtítulo, botões e números) desce para baixo dos cartões.
 * No computador as duas colunas ficam como sempre (as classes só valem abaixo de `lg`).
 */
export default function HeroFases({
  topo,
  apresentacao,
  vitrine,
  atraso = 2800,
}: {
  topo: React.ReactNode;
  apresentacao: React.ReactNode;
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
      className="group/hero relative z-10 mx-auto flex w-full max-w-6xl flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:content-center lg:items-start lg:gap-x-14"
    >
      <div className="order-1 text-center lg:col-start-1 lg:row-start-1 lg:text-left">{topo}</div>

      {/* apresentação: 2ª no começo, desce para depois dos cartões quando eles aparecem */}
      <div className="order-2 text-center max-lg:group-data-[compacto=true]/hero:order-3 max-lg:group-data-[compacto=true]/hero:animate-[apresentacao-desce_0.8s_ease-out_0.35s_both] lg:col-start-1 lg:row-start-2 lg:text-left">
        {apresentacao}
      </div>

      {/* cartões: entram suavemente quando o título encolhe */}
      <div className="order-3 grid transition-[grid-template-rows,opacity] duration-700 ease-out max-lg:grid-rows-[0fr] max-lg:opacity-0 max-lg:group-data-[compacto=true]/hero:order-2 max-lg:group-data-[compacto=true]/hero:grid-rows-[1fr] max-lg:group-data-[compacto=true]/hero:opacity-100 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-center">
        <div className="min-h-0 overflow-hidden px-1 pb-4 pt-5 lg:overflow-visible lg:p-0">
          {vitrine}
        </div>
      </div>
    </div>
  );
}
