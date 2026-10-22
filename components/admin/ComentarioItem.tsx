"use client";

import { useTransition } from "react";
import { excluirComentario, moderarComentario } from "@/app/(site)/admin/actions";

export type ComentarioSerie = {
  id: string;
  episodio: string;
  nome: string;
  texto: string;
  aprovado: boolean;
  created_at: string;
};

export default function ComentarioItem({
  c,
  rotulo,
}: {
  c: ComentarioSerie;
  rotulo: string;
}) {
  const [pendente, iniciar] = useTransition();
  const data = new Date(c.created_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
  const botao =
    "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

  return (
    <li
      className={`card p-4 ${c.aprovado ? "" : "border-amber-300 bg-amber-50"} ${
        pendente ? "opacity-50" : ""
      }`}
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-slate-500">
        <span>
          <b className="text-fg">{c.nome}</b> · {rotulo}
          {!c.aprovado && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 font-semibold uppercase tracking-wider text-white">
              Aguardando
            </span>
          )}
        </span>
        <span>{data}</span>
      </div>
      <p className="whitespace-pre-line break-words text-sm text-muted">{c.texto}</p>
      <div className="mt-3 flex gap-2">
        <button
          className={botao}
          onClick={() => iniciar(() => moderarComentario(c.id, !c.aprovado))}
        >
          {c.aprovado ? "Ocultar" : "Aprovar"}
        </button>
        <button
          className={`${botao} text-red-600 hover:border-red-300 hover:bg-red-50`}
          onClick={() => {
            if (confirm("Excluir este comentário?")) iniciar(() => excluirComentario(c.id));
          }}
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
