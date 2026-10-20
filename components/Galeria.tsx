"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { ItemGaleria } from "@/lib/projects";

const Ctx = createContext<{
  abrir: (i: number) => void;
  total: number;
  videos: number;
} | null>(null);

function useGaleria() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Use dentro de <GaleriaProvider>");
  return ctx;
}

const icone = {
  fechar: "M6 6l12 12M18 6L6 18",
  anterior: "M15 5l-7 7 7 7",
  proxima: "M9 5l7 7-7 7",
} as const;

function Icone({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/** Rótulo do botão: "capturas", "clipes" ou os dois, conforme o conteúdo. */
function rotulo(total: number, videos: number) {
  if (videos === 0) {
    return total > 1 ? `Ver capturas de tela (${total})` : "Ver captura de tela";
  }
  if (videos === total) {
    return total > 1 ? `Ver clipes (${total})` : "Ver clipe";
  }
  return `Ver capturas e clipes (${total})`;
}

function Miniatura({ item, grande = false }: { item: ItemGaleria; grande?: boolean }) {
  const src = item.video ? (item.poster ?? "") : item.src;
  if (!src) return <div className="h-[54px] w-24 bg-slate-700" />;
  return (
    <span className="relative block">
      <Image
        src={src}
        alt=""
        width={grande ? 800 : 96}
        height={grande ? 450 : 54}
        className={
          grande
            ? "aspect-video w-full object-cover"
            : "h-[54px] w-24 bg-white object-cover"
        }
      />
      {item.video && (
        <span className="absolute inset-0 flex items-center justify-center bg-brand/35">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M7 4l13 8-13 8z" />
            </svg>
          </span>
        </span>
      )}
    </span>
  );
}

/** Envolve o card e guarda o estado da galeria (que abre em tela cheia). */
export function GaleriaProvider({
  titulo,
  itens,
  aviso,
  children,
}: {
  titulo: string;
  itens: ItemGaleria[];
  aviso?: string;
  children: React.ReactNode;
}) {
  const [indice, setIndice] = useState<number | null>(null);
  const voltarFoco = useRef<HTMLElement | null>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const total = itens.length;
  const videos = itens.filter((i) => i.video).length;

  const abrir = useCallback((i: number) => {
    voltarFoco.current = document.activeElement as HTMLElement | null;
    setIndice(i);
  }, []);

  const fechar = useCallback(() => {
    setIndice(null);
    voltarFoco.current?.focus();
  }, []);

  const ir = useCallback(
    (passo: number) =>
      setIndice((i) => (i === null ? i : (i + passo + total) % total)),
    [total],
  );

  const aberto = indice !== null;
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowLeft" && total > 1) ir(-1);
      else if (e.key === "ArrowRight" && total > 1) ir(1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    botaoFechar.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [aberto, fechar, ir, total]);

  const atual = indice !== null ? itens[indice] : null;

  return (
    <Ctx.Provider value={{ abrir, total, videos }}>
      {children}
      {atual &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Capturas e clipes de ${titulo}`}
            onClick={fechar}
            className="fixed inset-0 z-[70] flex flex-col bg-brand/95 backdrop-blur-sm"
          >
            <header
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between gap-4 px-5 py-4 text-white"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{titulo}</p>
                <p className="text-xs text-slate-300">
                  {atual.video ? "Clipe" : "Captura"} {(indice ?? 0) + 1} de{" "}
                  {total}
                </p>
              </div>
              <button
                ref={botaoFechar}
                onClick={fechar}
                aria-label="Fechar galeria"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Icone d={icone.fechar} />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
              {total > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    ir(-1);
                  }}
                  aria-label="Anterior"
                  className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:left-5"
                >
                  <Icone d={icone.anterior} />
                </button>
              )}

              <figure
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-full max-w-full flex-col items-center"
              >
                {atual.video ? (
                  <video
                    key={atual.src}
                    src={atual.src}
                    poster={atual.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    className="h-auto max-h-[62vh] w-auto max-w-full rounded-xl bg-black shadow-2xl"
                  />
                ) : (
                  <Image
                    key={atual.src}
                    src={atual.src}
                    alt={atual.legenda}
                    width={atual.width ?? 1600}
                    height={atual.height ?? 900}
                    sizes="(min-width: 1024px) 70vw, 95vw"
                    className="h-auto max-h-[62vh] w-auto max-w-full rounded-xl bg-white shadow-2xl"
                  />
                )}
                <figcaption className="mt-4 max-w-xl text-center text-sm text-slate-200">
                  {atual.legenda}
                </figcaption>
              </figure>

              {total > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    ir(1);
                  }}
                  aria-label="Próximo"
                  className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:right-5"
                >
                  <Icone d={icone.proxima} />
                </button>
              )}
            </div>

            <footer
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-3 px-5 pb-5 pt-3"
            >
              {total > 1 && (
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {itens.map((it, i) => (
                    <button
                      key={it.src}
                      onClick={() => setIndice(i)}
                      aria-label={`Ver ${it.video ? "clipe" : "captura"} ${i + 1}: ${it.legenda}`}
                      aria-current={i === indice}
                      className={`shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                        i === indice
                          ? "ring-accent-light"
                          : "opacity-60 ring-transparent hover:opacity-100"
                      }`}
                    >
                      <Miniatura item={it} />
                    </button>
                  ))}
                </div>
              )}
              {aviso && (
                <p className="max-w-xl text-center text-xs text-slate-300">
                  {aviso}
                </p>
              )}
            </footer>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

/** Miniatura do card; clicar abre a galeria no primeiro item. */
export function GaleriaCapa({
  src,
  titulo,
  className = "mb-5",
}: {
  src: string;
  titulo: string;
  className?: string;
}) {
  const { abrir, total, videos } = useGaleria();
  return (
    <button
      onClick={() => abrir(0)}
      data-track={`galeria-${titulo}`}
      aria-label={`Abrir ${videos ? "capturas e clipes" : "capturas de tela"} de ${titulo}`}
      className={`group/capa relative block w-full overflow-hidden rounded-xl border border-line ${className}`}
    >
      <Image
        src={src}
        alt={`Capa do projeto ${titulo}`}
        width={800}
        height={450}
        className="aspect-video w-full object-cover transition duration-300 group-hover/capa:scale-[1.03]"
      />
      {videos > 0 && (
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-brand/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path d="M7 4l13 8-13 8z" />
          </svg>
          Clipes de navegação
        </span>
      )}
      <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-brand/60 to-transparent p-3 opacity-0 transition group-hover/capa:opacity-100 group-focus-visible/capa:opacity-100">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
          {total > 1 ? `Ver ${total} itens` : "Ampliar captura"}
        </span>
      </span>
    </button>
  );
}

/** Botão de texto do card, no lugar do link para projetos que não são públicos. */
export function GaleriaBotao({ titulo }: { titulo: string }) {
  const { abrir, total, videos } = useGaleria();
  return (
    <button
      onClick={() => abrir(0)}
      data-track={`galeria-${titulo}`}
      className="inline-flex w-fit text-sm font-semibold text-fg transition hover:text-accent-strong"
    >
      <span className="border-b-2 border-slate-300 pb-0.5 transition group-hover:border-accent-strong">
        {rotulo(total, videos)}
      </span>
    </button>
  );
}
