"use client";

import { useTransition } from "react";
import { alternarLida, excluirMensagem } from "@/app/(site)/admin/actions";

export type Mensagem = {
  id: string;
  nome: string;
  email: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
};

export default function MensagemItem({ m }: { m: Mensagem }) {
  const [pendente, iniciar] = useTransition();
  const data = new Date(m.created_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  const botao =
    "rounded-lg border border-line bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

  return (
    <li
      className={`card relative flex gap-4 p-5 ${
        m.lida ? "" : "border-accent/40 bg-accent/5"
      } ${pendente ? "opacity-50" : ""}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          m.lida
            ? "bg-slate-100 text-slate-500"
            : "bg-accent-strong/10 text-accent-strong"
        }`}
        aria-hidden
      >
        {m.nome.trim().charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="truncate font-semibold text-fg">
            {m.nome}
            {!m.lida && (
              <span className="ml-2 rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Nova
              </span>
            )}
          </p>
          <span className="text-xs text-slate-500">{data}</span>
        </div>
        <a
          href={`mailto:${m.email}`}
          className="text-sm text-muted transition hover:text-accent-strong"
        >
          {m.email}
        </a>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {m.mensagem}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a
            href={`mailto:${m.email}?subject=Re: seu contato no portfólio`}
            className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white transition hover:bg-accent-strong"
          >
            Responder
          </a>
          <button
            className={botao}
            onClick={() => iniciar(() => alternarLida(m.id, !m.lida))}
          >
            {m.lida ? "Marcar como não lida" : "Marcar como lida"}
          </button>
          <button
            className={`${botao} hover:border-red-300 hover:bg-red-50 hover:text-red-700`}
            onClick={() => {
              if (confirm("Excluir esta mensagem?")) {
                iniciar(() => excluirMensagem(m.id));
              }
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </li>
  );
}
