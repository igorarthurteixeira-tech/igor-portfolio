"use client";

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const Cena3D = dynamic(() => import("./Cena3D"), { ssr: false });

const TINTAS = [
  { nome: "Carmim", cor: "#b3122a" },
  { nome: "Pérola", cor: "#e7e2d8" },
  { nome: "Grafite", cor: "#3a3c42" },
];

/* ---- utilidades de ambiente (sem setState dentro de efeito) ---- */
function useMedia(consulta: string, servidor = false) {
  return useSyncExternalStore(
    (f) => {
      const m = window.matchMedia(consulta);
      m.addEventListener("change", f);
      return () => m.removeEventListener("change", f);
    },
    () => window.matchMedia(consulta).matches,
    () => servidor,
  );
}

function temWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Se o 3D falhar (sem WebGL ou erro ao carregar o modelo), cai na foto. */
class Protegido extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    return this.state.erro ? this.props.fallback : this.props.children;
  }
}

function Foto() {
  return (
    <div className="absolute inset-0">
      <Image src="/showroom/hero.jpg" alt="Picape cinza em um salão de vendas" fill priority sizes="100vw" className="object-cover object-center opacity-70" />
    </div>
  );
}

export default function HeroShowroom({ children }: { children: React.ReactNode }) {
  const largo = useMedia("(min-width: 1024px)");
  const semMovimento = useMedia("(prefers-reduced-motion: reduce)");
  const [webgl] = useState(() => (typeof window === "undefined" ? true : temWebGL()));

  const [variante, setVariante] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [visivel, setVisivel] = useState(true);
  const [automatico, setAutomatico] = useState<boolean | null>(null);
  const [interagindo, setInteragindo] = useState(false);
  const [aposInteracao, setAposInteracao] = useState(false);
  const raiz = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // pausa o desenho quando a hero sai da tela
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const aoInteragir = useCallback((v: boolean) => {
    clearTimeout(timer.current);
    setInteragindo(v);
    if (v) setAposInteracao(true);
    else timer.current = setTimeout(() => setAposInteracao(false), 2500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const aoFicarPronto = useCallback(() => setPronto(true), []);

  // gira sozinho, a menos que o usuário peça para parar ou prefira menos movimento
  const queroGirar = automatico ?? !semMovimento;
  const girar = queroGirar && !interagindo && !aposInteracao;

  return (
    <section ref={raiz} className="relative isolate overflow-hidden bg-brand text-white">
      {/* palco 3D */}
      <div className="absolute inset-x-0 bottom-0 top-[330px] lg:top-0" aria-hidden={!webgl}>
        {webgl ? (
          <Protegido fallback={<Foto />}>
            <div className="absolute inset-0 touch-pan-y">
              <Cena3D
                variante={variante}
                deslocamento={largo ? 3.1 : 0}
                girar={girar}
                visivel={visivel}
                aoInteragir={aoInteragir}
                aoFicarPronto={aoFicarPronto}
              />
            </div>
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-brand transition-opacity duration-700 ${pronto ? "opacity-0" : "opacity-100"}`}
              aria-live="polite"
            >
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Montando o showroom…</p>
            </div>
          </Protegido>
        ) : (
          <Foto />
        )}
      </div>

      {/* vinhetas por cima do 3D: legibilidade do texto e brilho vermelho */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand via-transparent to-brand/60 lg:bg-gradient-to-r lg:from-brand lg:via-brand/55 lg:to-transparent" />
      <div className="pointer-events-none absolute -right-24 top-10 h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-[120px]" />

      {/* conteúdo (o texto não captura o arraste, só os botões) */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[820px] max-w-7xl flex-col px-5 pb-28 pt-12 lg:min-h-[640px] lg:justify-center lg:pt-16">
        <div className="max-w-xl [&_a]:pointer-events-auto">{children}</div>
      </div>

      {/* etiqueta: deixa claro que o carro 3D é uma peça de vitrine */}
      {webgl && pronto && (
        <div className="pointer-events-none absolute right-6 top-6 z-20 hidden max-w-[16rem] rounded-md border border-white/10 bg-black/55 px-4 py-3 text-right backdrop-blur lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-light">Peça de vitrine</p>
          <p className="mt-1 text-lg leading-tight text-white" style={{ fontFamily: "var(--font-oswald), sans-serif" }}>
            Vértice Concept
          </p>
          <p className="mt-1 text-xs text-slate-400">Carro de exposição da casa. Não está à venda.</p>
        </div>
      )}

      {/* controles do 3D */}
      {webgl && pronto && (
        <div className="absolute bottom-6 left-1/2 z-20 flex w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-md border border-white/10 bg-black/55 px-4 py-3 backdrop-blur lg:left-auto lg:right-6 lg:translate-x-0">
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Cor da pintura">
            {TINTAS.map((t, i) => (
              <button
                key={t.nome}
                role="radio"
                aria-checked={variante === i}
                aria-label={`Pintura ${t.nome}`}
                onClick={() => setVariante(i)}
                className={`h-7 w-7 rounded-full border-2 transition ${variante === i ? "scale-110 border-white" : "border-white/25 hover:border-white/60"}`}
                style={{ background: t.cor }}
              />
            ))}
            <span className="ml-1 w-14 text-sm text-slate-200">{TINTAS[variante].nome}</span>
          </div>
          <button
            onClick={() => setAutomatico(!queroGirar)}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:text-white"
            style={{ fontFamily: "var(--font-oswald), sans-serif" }}
          >
            {queroGirar ? "Parar giro" : "Girar sozinho"}
          </button>
          <p className="hidden text-xs text-slate-400 sm:block">Arraste para girar · role para aproximar</p>
        </div>
      )}
    </section>
  );
}
