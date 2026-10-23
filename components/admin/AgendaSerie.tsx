"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAgendaSerie } from "@/app/(site)/admin/publicacoes/actions";

/** Campo do texto de agenda da série (ex.: "Episódios todos os dias às 12h"), exibido no site. */
export default function AgendaSerie({ slug, inicial }: { slug: string; inicial: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const alterado = texto.trim() !== inicial.trim();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await salvarAgendaSerie(slug, texto);
      setMsg(r.ok ? { ok: true, texto: texto.trim() ? "Salvo. Já aparece no site." : "Texto removido do site." } : { ok: false, texto: r.erro });
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
      <label className="flex min-w-0 flex-1 basis-64 flex-col gap-1 text-xs font-medium text-slate-500">
        Texto de agenda exibido no site
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={80}
          placeholder="Ex.: Episódios todos os dias às 12h"
          className="field"
        />
      </label>
      <button
        disabled={pendente || !alterado}
        className="self-end rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-accent disabled:opacity-40"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
      {msg && (
        <p className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
          {msg.texto}
        </p>
      )}
    </form>
  );
}
