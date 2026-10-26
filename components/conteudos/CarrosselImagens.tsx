"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Os slides ficam lado a lado; o dedo (ou o trackpad) rola de um para o outro, e as setas e o teclado também. */
export default function CarrosselImagens({ imagens, titulo }: { imagens: string[]; titulo: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  const ir = useCallback((i: number) => {
    const el = trilho.current;
    if (!el) return;
    const alvo = Math.max(0, Math.min(imagens.length - 1, i));
    el.scrollTo({ left: alvo * el.clientWidth, behavior: "smooth" });
  }, [imagens.length]);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const aoRolar = () => setAtual(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", aoRolar, { passive: true });
    return () => el.removeEventListener("scroll", aoRolar);
  }, []);

  const seta =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-0 sm:flex";

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrossel"
      aria-label={titulo}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") ir(atual + 1);
        if (e.key === "ArrowLeft") ir(atual - 1);
      }}
    >
      <div
        ref={trilho}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-slate-900 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {imagens.map((src, i) => (
          <div key={src} className="aspect-4/5 w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${titulo}, slide ${i + 1} de ${imagens.length}`}
              width={1080}
              height={1350}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      <button className={`${seta} left-3`} onClick={() => ir(atual - 1)} disabled={atual === 0} aria-label="Slide anterior">
        ‹
      </button>
      <button
        className={`${seta} right-3`}
        onClick={() => ir(atual + 1)}
        disabled={atual === imagens.length - 1}
        aria-label="Próximo slide"
      >
        ›
      </button>

      <div className="mt-4 flex items-center justify-center gap-2" aria-hidden>
        {imagens.map((_, i) => (
          <button
            key={i}
            tabIndex={-1}
            onClick={() => ir(i)}
            className={`h-2 rounded-full transition-all ${i === atual ? "w-6 bg-accent-strong" : "w-2 bg-slate-300"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-slate-500" aria-live="polite">
        {atual + 1} de {imagens.length}
      </p>
    </div>
  );
}
