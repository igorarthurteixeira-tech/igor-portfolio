"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que começa em 0 e sobe até o valor quando entra na tela.
 * Começa em 0 também no HTML do servidor, então não aparece o valor final
 * antes da contagem. O valor final fica disponível para leitores de tela.
 */
export default function Contador({
  valor,
  duracao = 1600,
  atraso = 450,
}: {
  valor: number;
  duracao?: number;
  /** Pausa em 0 antes de começar, para o zero ser visto. */
  atraso?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // mostra o valor final já, sem animar (em callback, não direto no efeito)
      const quadro = requestAnimationFrame(() => setN(valor));
      return () => cancelAnimationFrame(quadro);
    }

    let raf = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      espera = setTimeout(() => {
        const ini = performance.now();
        const passo = (t: number) => {
          const p = Math.min(1, (t - ini) / duracao);
          setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(passo);
        };
        raf = requestAnimationFrame(passo);
      }, atraso);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(espera);
      cancelAnimationFrame(raf);
    };
  }, [valor, duracao, atraso]);

  return (
    <span ref={ref}>
      <span aria-hidden>{n}</span>
      <span className="sr-only">{valor}</span>
    </span>
  );
}
