"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarValor } from "@/lib/etm";
import { responderCobranca } from "@/app/(site)/etm/actions";

/**
 * Cartão que pede o aceite da cobrança antes de a produção começar.
 * Deixa claro que nada é cobrado agora: a cobrança só acontece ao final do vídeo.
 */
export default function AceiteCobranca({ pedidoId, valor }: { pedidoId: string; valor: number }) {
  const router = useRouter();
  const [concordo, setConcordo] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const valorTexto = formatarValor(valor);

  async function responder(aceita: boolean) {
    setErro("");
    setOcupado(true);
    const r = await responderCobranca(pedidoId, aceita, aceita ? "" : motivo);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.refresh();
  }

  return (
    <div className="card space-y-4 border-2 border-sky-400 bg-sky-50 p-5 shadow-lg shadow-sky-200/60 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white">Aguardando o seu aceite</span>
        <span className="text-xs font-medium text-sky-900">Sem o aceite, a produção não começa</span>
      </div>

      <div>
        <p className="text-sm font-semibold text-sky-900">Este vídeo gera cobrança</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-fg">{valorTexto}</p>
      </div>

      <p className="rounded-lg bg-white px-4 py-3 text-sm leading-relaxed text-fg">
        <span className="font-semibold">Nada é cobrado agora.</span> A cobrança só será feita <span className="font-semibold">ao final do vídeo</span>,
        depois que ele estiver pronto e aprovado. O download do vídeo final é liberado depois da confirmação do pagamento. O seu aceite fica registrado no pedido.
      </p>

      {!recusando ? (
        <>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-fg">
            <input
              type="checkbox"
              checked={concordo}
              onChange={(e) => setConcordo(e.target.checked)}
              disabled={ocupado}
              className="mt-0.5 h-4 w-4 accent-sky-600"
            />
            <span>
              Li e concordo com a cobrança de <strong>{valorTexto}</strong> por este vídeo, a ser feita apenas ao final, e que o download do vídeo final só é liberado depois do pagamento.
            </span>
          </label>
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={!concordo || ocupado}
              onClick={() => responder(true)}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {ocupado ? "Registrando..." : "Aceitar e autorizar a produção"}
            </button>
            <button
              disabled={ocupado}
              onClick={() => setRecusando(true)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Não aceitar
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <label htmlFor="motivo-recusa" className="block text-sm font-semibold text-fg">
            Quer contar o motivo? (opcional)
          </label>
          <textarea
            id="motivo-recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={ocupado}
            placeholder="Ex.: O valor está acima do combinado."
            className="field resize-y bg-white"
          />
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={ocupado}
              onClick={() => responder(false)}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {ocupado ? "Registrando..." : "Confirmar que não aceito"}
            </button>
            <button
              disabled={ocupado}
              onClick={() => setRecusando(false)}
              className="px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
