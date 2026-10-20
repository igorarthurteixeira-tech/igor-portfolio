"use client";

import { useEffect, useState } from "react";

/**
 * Alterna o final do título. Todas as variações ficam empilhadas na mesma
 * célula de uma grade, então a largura é a da maior e o texto em volta
 * não "pula" quando a palavra troca.
 */
export default function PalavraGiratoria({
  variacoes,
  intervalo = 2800,
}: {
  variacoes: string[];
  intervalo?: number;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (variacoes.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(
      () => setI((v) => (v + 1) % variacoes.length),
      intervalo,
    );
    return () => clearInterval(t);
  }, [variacoes.length, intervalo]);

  return (
    <span className="relative mx-auto grid w-fit lg:mx-0">
      {variacoes.map((v, idx) => (
        <span
          key={v}
          aria-hidden={idx !== i}
          className={`col-start-1 row-start-1 whitespace-nowrap transition-all duration-500 ease-out ${
            idx === i
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          {v}
        </span>
      ))}
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-accent-light to-[#22d3ee] opacity-80"
      />
    </span>
  );
}
