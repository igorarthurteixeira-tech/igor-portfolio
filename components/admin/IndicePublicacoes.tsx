"use client";

import { useEffect, useState } from "react";
import type { Situacao } from "@/lib/publicacoes";

export type ItemIndice = { id: string; rotulo: string; estado: Situacao };
export type GrupoIndice = { chave: string; titulo: string; itens: ItemIndice[] };

const PONTO: Record<Situacao, string> = {
  atencao: "bg-amber-500",
  agendada: "bg-sky-500",
  "sem-data": "bg-slate-400",
  concluida: "bg-emerald-500",
};
const DICA: Record<Situacao, string> = {
  atencao: "Precisa de atenção",
  agendada: "Agendada",
  "sem-data": "Sem data",
  concluida: "Concluída",
};

/** Índice lateral: séries e episódios, com rolagem suave e destaque de onde você está na página. */
export default function IndicePublicacoes({ grupos }: { grupos: GrupoIndice[] }) {
  const [ativo, setAtivo] = useState<string | null>(null);

  useEffect(() => {
    const alvos = grupos.flatMap((g) => [`serie-${g.chave}`, ...g.itens.map((i) => `pub-${i.id}`)]);
    const visiveis = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.set(e.target.id, e.boundingClientRect.top);
          else visiveis.delete(e.target.id);
        }
        const primeiro = [...visiveis.entries()].sort((a, b) => a[1] - b[1])[0];
        if (primeiro) setAtivo(primeiro[0]);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const id of alvos) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [grupos]);

  function ir(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setAtivo(id);
  }

  const total = grupos.reduce((n, g) => n + g.itens.length, 0);

  return (
    <nav
      aria-label="Índice das publicações"
      className="hidden lg:sticky lg:top-36 lg:block lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto lg:pr-2"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Índice <span className="font-normal normal-case tracking-normal">· {total}</span>
      </p>
      <ul className="space-y-4">
        {grupos.map((g) => {
          const idSerie = `serie-${g.chave}`;
          return (
            <li key={g.chave}>
              <button
                onClick={() => ir(idSerie)}
                className={`block w-full truncate text-left text-sm font-bold transition ${
                  ativo === idSerie ? "text-accent-strong" : "text-fg hover:text-accent-strong"
                }`}
              >
                {g.titulo}
              </button>
              <ul className="mt-1.5 space-y-0.5 border-l border-line pl-3">
                {g.itens.map((i) => {
                  const id = `pub-${i.id}`;
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => ir(id)}
                        title={`${i.rotulo} · ${DICA[i.estado]}`}
                        aria-current={ativo === id ? "location" : undefined}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition ${
                          ativo === id
                            ? "bg-accent-strong/10 font-semibold text-accent-strong"
                            : "text-muted hover:bg-slate-100 hover:text-fg"
                        }`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${PONTO[i.estado]}`} aria-hidden />
                        <span className="truncate">{i.rotulo}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
