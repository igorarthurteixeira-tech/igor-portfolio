"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataHora } from "@/lib/etm";
import { responderDuvida } from "@/app/(site)/etm/actions";

export type PerguntaAberta = { id: string; autor: string; texto: string; quando: string };

function Pergunta({ pedidoId, pergunta }: { pedidoId: string; pergunta: PerguntaAberta }) {
  const router = useRouter();
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await responderDuvida(pedidoId, pergunta.id, resposta);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    router.refresh();
  }

  return (
    <form onSubmit={responder} className="card space-y-3 border-2 border-amber-400 bg-amber-50 p-5 shadow-lg shadow-amber-200/60 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">Pergunta aguardando sua resposta</span>
        <p className="text-xs text-amber-900">
          {pergunta.autor} · {dataHora(pergunta.quando)}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-lg font-semibold leading-snug text-fg">{pergunta.texto}</p>
      <textarea
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        rows={3}
        maxLength={4000}
        required
        disabled={enviando}
        placeholder="Escreva a sua resposta..."
        className="field resize-y bg-white"
      />
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enviando || resposta.trim().length < 2} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">
          {enviando ? "Enviando..." : "Responder"}
        </button>
        <p className="text-xs text-amber-900">Para mandar uma foto junto, use &ldquo;Enviar mensagem&rdquo; logo abaixo.</p>
      </div>
    </form>
  );
}

/** Perguntas que ainda esperam resposta da ETM: ficam no topo da página do pedido, em destaque. */
export default function PerguntasAbertas({ pedidoId, perguntas }: { pedidoId: string; perguntas: PerguntaAberta[] }) {
  return (
    <div className="space-y-4">
      {perguntas.map((p) => (
        <Pergunta key={p.id} pedidoId={pedidoId} pergunta={p} />
      ))}
    </div>
  );
}
