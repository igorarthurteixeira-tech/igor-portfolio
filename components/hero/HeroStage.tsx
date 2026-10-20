"use client";

import { useRef } from "react";

/**
 * Seção da hero. Acompanha o ponteiro e expõe variáveis CSS para os filhos
 * (--mx/--my de -1 a 1 para o parallax; --gx/--gy em % para o brilho),
 * sem re-renderizar nada.
 */
export default function HeroStage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  function mover(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", (x * 2 - 1).toFixed(3));
    el.style.setProperty("--my", (y * 2 - 1).toFixed(3));
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
  }

  function soltar() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
    el.style.setProperty("--gx", "50%");
    el.style.setProperty("--gy", "40%");
  }

  return (
    <section
      ref={ref}
      onPointerMove={mover}
      onPointerLeave={soltar}
      className={className}
      style={
        { "--mx": 0, "--my": 0, "--gx": "50%", "--gy": "40%" } as React.CSSProperties
      }
    >
      {children}
    </section>
  );
}
