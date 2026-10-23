"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { EstadoPonto } from "@/lib/publicacoes";

export type PontoVisual = {
  id: string;
  rotulo: string;
  estado: EstadoPonto;
  /** Data já formatada (publicação ou agendamento). */
  data: string;
  miniatura?: string;
  redes: { sigla: string; status: "pendente" | "processando" | "publicado" | "erro" }[];
  /** Aba onde o item está na lista (para o clique levar até ele). */
  aba: "fila" | "concluidas";
};

const ANEL: Record<EstadoPonto, string> = {
  publicado: "ring-emerald-500",
  parcial: "ring-teal-400",
  agendada: "ring-sky-400",
  atencao: "ring-amber-500",
  "sem-data": "ring-slate-300",
};
const BOLA: Record<EstadoPonto, string> = {
  publicado: "bg-emerald-500",
  parcial: "bg-teal-400",
  agendada: "bg-sky-400",
  atencao: "bg-amber-500",
  "sem-data": "bg-slate-300",
};
const ROTULO: Record<EstadoPonto, string> = {
  publicado: "Publicado",
  parcial: "Parcial",
  agendada: "Agendado",
  atencao: "Atenção",
  "sem-data": "Sem data",
};
const REDE: Record<PontoVisual["redes"][number]["status"], string> = {
  pendente: "bg-slate-200 text-slate-500",
  processando: "bg-sky-100 text-sky-700",
  publicado: "bg-emerald-100 text-emerald-700",
  erro: "bg-red-100 text-red-700",
};

function Cartao({ p }: { p: PontoVisual }) {
  return (
    <li className="relative w-[184px] shrink-0 pt-6">
      <span
        aria-hidden
        className={`absolute left-1/2 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white ${BOLA[p.estado]}`}
      />
      <Link
        href={`/admin/publicacoes?aba=${p.aba}#pub-${p.id}`}
        title={`${p.rotulo} · ${ROTULO[p.estado]}`}
        className="group block text-center"
      >
        <span
          className={`mx-auto block h-[288px] w-[162px] overflow-hidden rounded-lg bg-slate-200 ring-2 ring-offset-2 ring-offset-white transition group-hover:-translate-y-0.5 group-hover:shadow-lg ${ANEL[p.estado]} ${
            p.estado === "sem-data" ? "opacity-80" : ""
          }`}
        >
          {p.miniatura ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.miniatura} alt="" width={324} height={576} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-slate-400">sem capa</span>
          )}
        </span>
        <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-tight text-fg">{p.rotulo}</span>
        <span className="mt-0.5 block text-[11px] text-slate-500">{p.data}</span>
        <span className="mt-1 flex justify-center gap-1">
          {p.redes.map((r) => (
            <span key={r.sigla} className={`rounded px-1 text-[9px] font-bold leading-4 ${REDE[r.status]}`}>
              {r.sigla}
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

/**
 * Linha do tempo, da esquerda para a direita: o que já saiu, o marcador "Hoje" e o que vem pela frente.
 * Itens sem data ficam depois, separados.
 */
export default function LinhaDoTempo({
  passado,
  futuro,
  semData,
  hoje,
}: {
  passado: PontoVisual[];
  futuro: PontoVisual[];
  semData: PontoVisual[];
  hoje: string;
}) {
  const rolagem = useRef<HTMLDivElement>(null);
  const marcador = useRef<HTMLLIElement>(null);

  // Abre já com o "Hoje" no meio da tela.
  useEffect(() => {
    const el = rolagem.current;
    const m = marcador.current;
    if (el && m) el.scrollLeft = m.offsetLeft - el.clientWidth / 2 + m.clientWidth / 2;
  }, [passado.length, futuro.length]);

  if (passado.length + futuro.length + semData.length === 0) return null;

  return (
    <section aria-label="Linha do tempo das publicações" className="card mb-5 p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-fg">Linha do tempo</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {(["publicado", "parcial", "agendada", "atencao", "sem-data"] as EstadoPonto[]).map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${BOLA[e]}`} aria-hidden />
              {ROTULO[e]}
            </li>
          ))}
        </ul>
      </div>
      <div ref={rolagem} className="overflow-x-auto pb-2 [scrollbar-width:thin]">
        <ol className="relative flex min-w-max gap-4 before:absolute before:left-0 before:right-0 before:top-[13px] before:h-0.5 before:bg-slate-200">
          {passado.map((p) => (
            <Cartao key={p.id} p={p} />
          ))}
          <li ref={marcador} className="relative flex w-28 shrink-0 flex-col items-center pt-0.5" aria-label={`Hoje, ${hoje}`}>
            <span className="relative z-10 whitespace-nowrap rounded-full bg-accent-strong px-3 py-1 text-[11px] font-bold text-white shadow">
              Hoje · {hoje}
            </span>
            <span aria-hidden className="mt-1 h-[340px] w-0 border-l-2 border-dashed border-accent-strong/60" />
          </li>
          {futuro.map((p) => (
            <Cartao key={p.id} p={p} />
          ))}
          {semData.length > 0 && (
            <li aria-hidden className="relative flex w-10 shrink-0 flex-col items-center pt-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">sem data</span>
              <span className="mt-1 h-[340px] w-0 border-l-2 border-dotted border-slate-300" />
            </li>
          )}
          {semData.map((p) => (
            <Cartao key={p.id} p={p} />
          ))}
        </ol>
      </div>
    </section>
  );
}
