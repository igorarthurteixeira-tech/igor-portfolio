"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDEM_STATUS, STATUS, type ArquivoEnviado, type StatusPedido } from "@/lib/etm";
import { useRascunho } from "@/lib/etm-rascunho";
import { enviarArquivos, type ProgressoEnvio } from "@/lib/etm-upload";
import { criarUploadUrlEtm, responderPedido } from "@/app/(site)/etm/actions";
import {
  comentarComoIgor,
  criarUploadUrlAdminEtm,
  entregarVersao,
  mudarStatus,
} from "@/app/(site)/admin/etm/actions";
import SeletorArquivos from "./SeletorArquivos";

type Props = { pedidoId: string; status: StatusPedido; modo: "etm" | "igor"; limite: number; usuarioId: string };
type Resp = { ok: true } | { ok: false; erro: string };

export default function AcoesPedido({ pedidoId, status, modo, limite, usuarioId }: Props) {
  const router = useRouter();
  // o que foi digitado sobrevive a uma recarga da página (cada pedido e cada pessoa têm o seu rascunho)
  const { valores, atualizar, restaurado, limpar } = useRascunho(`etm-acao:${usuarioId}:${pedidoId}`, { texto: "", link: "" });
  const { texto, link } = valores;
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [novoStatus, setNovoStatus] = useState<StatusPedido>(status === "recebido" ? "em_producao" : status);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null);

  const preparar = modo === "etm" ? criarUploadUrlEtm : criarUploadUrlAdminEtm;

  /** Envia os anexos (se houver) e chama a ação; limpa o formulário no sucesso. */
  async function rodar(acao: (enviados: ArquivoEnviado[]) => Promise<Resp>) {
    setErro("");
    setOcupado(true);
    try {
      const enviados = await enviarArquivos(arquivos, (n, t) => preparar(pedidoId, n, t), setProgresso);
      const r = await acao(enviados);
      if (!r.ok) throw new Error(r.erro);
      limpar();
      setArquivos([]);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  }

  const pct = progresso && progresso.bytes ? Math.round((progresso.feito / progresso.bytes) * 100) : 0;
  const aguardando = status === "em_avaliacao";

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-fg">
        {modo === "etm" ? (aguardando ? "Avaliar a versão" : "Enviar mensagem") : "Responder e entregar"}
      </h2>
      {modo === "etm" && aguardando && (
        <p className="text-sm text-muted">Aprove o vídeo ou descreva o que precisa mudar. Pode anexar imagens de referência.</p>
      )}

      {restaurado && texto && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Recuperamos o texto que você estava escrevendo. Os arquivos precisam ser anexados de novo.
        </p>
      )}

      <textarea
        value={texto}
        onChange={(e) => atualizar({ texto: e.target.value })}
        rows={4}
        maxLength={4000}
        disabled={ocupado}
        placeholder={
          modo === "etm" && aguardando
            ? "Ex.: aos 0:12 trocar a foto; o texto da abertura está com o nome errado."
            : "Escreva uma mensagem..."
        }
        className="field resize-y"
      />

      {modo === "igor" && (
        <input
          value={link}
          onChange={(e) => atualizar({ link: e.target.value })}
          type="url"
          disabled={ocupado}
          placeholder="Link (opcional): YouTube vira player na página; Drive e outros ficam como link"
          className="field"
        />
      )}

      <SeletorArquivos
        limite={limite}
        arquivos={arquivos}
        onChange={setArquivos}
        onErro={setErro}
        disabled={ocupado}
        rotulo={modo === "igor" ? "Anexar vídeo ou arquivos" : "Anexar arquivos"}
      />

      {ocupado && progresso && (
        <div className="rounded-lg bg-page px-4 py-3 text-sm">
          <p className="mb-2 text-fg">
            Enviando {progresso.indice} de {progresso.total}: {progresso.nome} ({pct}%)
          </p>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-accent-strong transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        {modo === "etm" ? (
          <>
            <button
              disabled={ocupado}
              onClick={() => rodar((a) => responderPedido(pedidoId, "comentar", texto, a))}
              className="btn-outline px-5 py-2.5"
            >
              Enviar mensagem
            </button>
            {aguardando && (
              <>
                <button
                  disabled={ocupado}
                  onClick={() => rodar((a) => responderPedido(pedidoId, "correcao", texto, a))}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  Pedir correção
                </button>
                <button
                  disabled={ocupado}
                  onClick={() => rodar((a) => responderPedido(pedidoId, "aprovar", texto, a))}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Aprovar vídeo
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              disabled={ocupado}
              onClick={() => rodar((a) => comentarComoIgor(pedidoId, texto, a))}
              className="btn-outline px-5 py-2.5"
            >
              Só comentar
            </button>
            <button
              disabled={ocupado}
              onClick={() => rodar((a) => entregarVersao(pedidoId, texto, link, a))}
              className="btn-dark px-5 py-2.5"
            >
              Entregar versão para avaliação
            </button>
          </>
        )}
      </div>

      {modo === "igor" && (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold text-fg">Mudar status sem entregar</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as StatusPedido)}
              disabled={ocupado}
              className="field max-w-60"
            >
              {ORDEM_STATUS.map((s) => (
                <option key={s} value={s}>{STATUS[s].rotulo.replace("Aguardando sua avaliação", "Aguardando avaliação")}</option>
              ))}
            </select>
            <button
              disabled={ocupado || novoStatus === status}
              onClick={() => rodar(() => mudarStatus(pedidoId, novoStatus, texto, link))}
              className="btn-outline px-5 py-2.5"
            >
              Aplicar
            </button>
          </div>
          <p className="text-xs text-muted">A mensagem e o link acima vão junto com a mudança, por exemplo o link final ao marcar como enviado.</p>
        </div>
      )}
    </div>
  );
}
