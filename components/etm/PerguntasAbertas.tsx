"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataHora } from "@/lib/etm";
import { enviarArquivos, type ProgressoEnvio } from "@/lib/etm-upload";
import { criarUploadUrlEtm, responderDuvida } from "@/app/(site)/etm/actions";
import SeletorArquivos from "./SeletorArquivos";

export type PerguntaAberta = { id: string; autor: string; texto: string; quando: string };

function Pergunta({ pedidoId, pergunta, limite }: { pedidoId: string; pergunta: PerguntaAberta; limite: number }) {
  const router = useRouter();
  const [resposta, setResposta] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const enviados = await enviarArquivos(arquivos, (n, t) => criarUploadUrlEtm(pedidoId, n, t), setProgresso);
      const r = await responderDuvida(pedidoId, pergunta.id, resposta, enviados);
      if (!r.ok) throw new Error(r.erro);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar a resposta.");
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  const pct = progresso && progresso.bytes ? Math.round((progresso.feito / progresso.bytes) * 100) : 0;

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
        disabled={enviando}
        placeholder="Escreva a sua resposta..."
        className="field resize-y bg-white"
      />
      <SeletorArquivos limite={limite} arquivos={arquivos} onChange={setArquivos} onErro={setErro} disabled={enviando} />
      {enviando && progresso && (
        <div className="rounded-lg bg-white px-4 py-3 text-sm">
          <p className="mb-2 text-fg">
            Enviando {progresso.indice} de {progresso.total}: {progresso.nome} ({pct}%)
          </p>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-accent-strong transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <button
        disabled={enviando || (resposta.trim().length < 1 && arquivos.length === 0)}
        className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
      >
        {enviando ? "Enviando..." : "Responder"}
      </button>
    </form>
  );
}

/** Perguntas que ainda esperam resposta da ETM: ficam no topo da página do pedido, em destaque. */
export default function PerguntasAbertas({
  pedidoId,
  perguntas,
  limite,
}: {
  pedidoId: string;
  perguntas: PerguntaAberta[];
  limite: number;
}) {
  return (
    <div className="space-y-4">
      {perguntas.map((p) => (
        <Pergunta key={p.id} pedidoId={pedidoId} pergunta={p} limite={limite} />
      ))}
    </div>
  );
}
