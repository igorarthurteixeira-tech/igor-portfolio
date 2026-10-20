"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Item = {
  id: string;
  src: string;
  nome: string;
  selo: string;
  privado?: boolean;
};

/**
 * Pilha de janelas com capturas de projetos.
 *
 * - Em repouso, os cartões giram num ciclo contínuo: o da frente pula para
 *   trás, o de trás vai para o meio e o do meio vem para a frente.
 * - Com o mouse (ou o foco do teclado) em cima, o ciclo para e eles se
 *   espalham em triângulo, ainda um pouco tortos.
 * - Cada cartão é um link para o projeto na biblioteca.
 *
 * O parallax vem das variáveis --mx/--my da HeroStage.
 */

// posições do ciclo: 0 = frente, 1 = meio, 2 = trás
const SLOTS = [
  { x: 44, y: 262, r: -2, s: 1, z: 30, px: 26, py: 20 },
  { x: 214, y: 118, r: 3.5, s: 0.98, z: 20, px: 10, py: 8 },
  { x: 0, y: 0, r: -6, s: 0.94, z: 10, px: -16, py: -12 },
];
// posição inicial de cada item no ciclo: 1º atrás, 2º no meio, 3º na frente
const INICIAL = [2, 1, 0];

// espalhados em triângulo: primeiro (cima, esquerda), segundo (meio, direita),
// terceiro (baixo, esquerda)
const ESPALHADO = [
  { x: 0, y: 0, r: -5 },
  { x: 222, y: 150, r: 4 },
  { x: 8, y: 306, r: -3 },
];

const INTERVALO = 3600;
const LARGURA = 540;
const ALTURA = 500;

export default function HeroVitrine({ itens }: { itens: Item[] }) {
  const [ciclo, setCiclo] = useState(0);
  const [espalhado, setEspalhado] = useState(false);
  const [escala, setEscala] = useState(1);
  const raiz = useRef<HTMLDivElement>(null);
  const tocou = useRef(false);

  // o conjunto tem 540x500 px; em telas estreitas ele encolhe por inteiro (mesmas posições)
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / LARGURA));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // no toque não existe "passar o mouse": toque fora recolhe os cartões
  useEffect(() => {
    if (!espalhado) return;
    const fora = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !raiz.current?.contains(e.target as Node)) setEspalhado(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [espalhado]);

  useEffect(() => {
    if (espalhado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) setCiclo((c) => c + 1);
    }, INTERVALO);
    return () => clearInterval(t);
  }, [espalhado]);

  const lista = itens.slice(0, 3);

  return (
    <div
      ref={raiz}
      className="relative mx-auto w-full max-w-[540px]"
      style={{ height: ALTURA * escala }}
      onPointerDown={(e) => {
        tocou.current = e.pointerType === "touch";
      }}
      onPointerEnter={(e) => e.pointerType !== "touch" && setEspalhado(true)}
      onPointerLeave={(e) => e.pointerType !== "touch" && setEspalhado(false)}
      onFocus={() => !tocou.current && setEspalhado(true)}
      onBlur={() => !tocou.current && setEspalhado(false)}
    >
    <div
      className="absolute left-1/2 top-0 origin-top"
      style={{ width: LARGURA, height: ALTURA, transform: `translateX(-50%) scale(${escala})` }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 blur-[90px]"
      />
      {lista.map((it, i) => {
        const p = (INICIAL[i] + 2 * ciclo) % 3;
        const slot = SLOTS[p];
        const pos = espalhado
          ? { ...ESPALHADO[i], s: 1, z: 10 + i, px: 6, py: 5 }
          : slot;
        // o cartão que acabou de ir para trás "pula" por cima dos outros
        const pulando = !espalhado && ciclo > 0 && p === 2;
        return (
          <div
            key={it.id}
            className="absolute left-0 top-0 w-[300px] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              zIndex: pos.z,
              transform: `translate3d(calc(var(--mx) * ${pos.px}px + ${pos.x}px), calc(var(--my) * ${pos.py}px + ${pos.y}px), 0) rotate(${pos.r}deg) scale(${pos.s})`,
            }}
          >
            <div
              key={pulando ? `pulo-${ciclo}` : "fixo"}
              className={pulando ? "hero-pulo" : undefined}
            >
              <div className={`hero-flutua-${["a", "b", "c"][i]}`}>
                <Link
                  href={`/projetos#${it.id}`}
                  onClick={(e) => {
                    if (tocou.current && !espalhado) {
                      e.preventDefault();
                      setEspalhado(true);
                    }
                  }}
                  aria-label={`Ver ${it.nome} na biblioteca de projetos`}
                  className="block overflow-hidden rounded-2xl border border-white/20 bg-brand shadow-2xl shadow-black/50 outline-none transition-shadow hover:border-white/50 hover:shadow-accent/30 focus-visible:ring-2 focus-visible:ring-accent-light"
                >
                  <span className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.07] px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                    <span className="ml-2 truncate text-[10px] font-medium text-slate-300">
                      {it.nome}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        it.privado
                          ? "bg-white/15 text-white"
                          : "bg-emerald-400/15 text-emerald-300"
                      }`}
                    >
                      {it.selo}
                    </span>
                  </span>
                  <Image
                    src={it.src}
                    alt=""
                    width={600}
                    height={338}
                    sizes="300px"
                    className="aspect-video w-full object-cover object-top"
                  />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
