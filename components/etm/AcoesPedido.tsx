"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArquivoEnviado, StatusPedido } from "@/lib/etm";
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

/**
 * Em que ponto do fluxo o pedido está, do lado de quem produz:
 * - aceitar: acabou de chegar (ou voltou com pedido de correção); basta avisar que viu e começou;
 * - entregar: em produção; é aqui que se envia o vídeo, passando para a avaliação;
 * - aguardar: a ETM está avaliando;
 * - enviar: a ETM aprovou; falta o envio final;
 * - encerrado: enviado ou cancelado.
 */
type Fase = "aceitar" | "entregar" | "aguardar" | "enviar" | "encerrado";

function faseDe(status: StatusPedido): Fase {
  if (status === "recebido" || status === "correcao") return "aceitar";
  if (status === "em_producao") return "entregar";
  if (status === "em_avaliacao") return "aguardar";
  if (status === "aprovado") return "enviar";
  return "encerrado";
}

const TEXTOS: Record<Fase, { titulo: string; ajuda: string; placeholder: string }> = {
  aceitar: {
    titulo: "Responder ao pedido",
    ajuda: "Avise a ETM que você viu o pedido e que a produção começou. A mensagem é opcional.",
    placeholder: "Opcional. Ex.: Recebi o pedido e começo a produção hoje.",
  },
  entregar: {
    titulo: "Entregar a versão",
    ajuda: "Anexe o vídeo ou cole o link. Ao enviar, o pedido segue para a avaliação da ETM.",
    placeholder: "Opcional: uma mensagem junto com a versão.",
  },
  aguardar: {
    titulo: "Aguardando a avaliação da ETM",
    ajuda: "A ETM está avaliando a última versão. Você ainda pode mandar uma mensagem.",
    placeholder: "Escreva uma mensagem...",
  },
  enviar: {
    titulo: "Envio final",
    ajuda: "A ETM aprovou. Cole o link final (opcional) e marque o pedido como enviado.",
    placeholder: "Opcional: uma mensagem final.",
  },
  encerrado: {
    titulo: "Pedido encerrado",
    ajuda: "Você ainda pode registrar uma mensagem.",
    placeholder: "Escreva uma mensagem...",
  },
};

export default function AcoesPedido({ pedidoId, status, modo, limite, usuarioId }: Props) {
  const router = useRouter();
  // o que foi digitado sobrevive a uma recarga da página (cada pedido e cada pessoa têm o seu rascunho)
  const { valores, atualizar, restaurado, limpar } = useRascunho(`etm-acao:${usuarioId}:${pedidoId}`, { texto: "", link: "" });
  const { texto, link } = valores;
  const [arquivos, setArquivos] = useState<File[]>([]);
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

  function cancelar() {
    if (!window.confirm("Cancelar este pedido? A ETM vai ver que ele foi cancelado.")) return;
    rodar(() => mudarStatus(pedidoId, "cancelado", texto, ""));
  }

  const pct = progresso && progresso.bytes ? Math.round((progresso.feito / progresso.bytes) * 100) : 0;
  const aguardando = status === "em_avaliacao";
  const fase = faseDe(status);
  const t = TEXTOS[fase];

  // do lado de quem produz, o link só faz sentido ao entregar ou ao enviar; os anexos, ao entregar ou comentar
  const mostrarLink = modo === "igor" && (fase === "entregar" || fase === "enviar");
  const mostrarAnexos = modo === "etm" || fase === "entregar" || fase === "aguardar" || fase === "encerrado";

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-fg">
        {modo === "etm" ? (aguardando ? "Avaliar a versão" : "Enviar mensagem") : t.titulo}
      </h2>
      {modo === "etm" && aguardando && (
        <p className="text-sm text-muted">Aprove o vídeo ou descreva o que precisa mudar. Pode anexar imagens de referência.</p>
      )}
      {modo === "igor" && (
        <p className="text-sm text-muted">
          {fase === "aceitar" && status === "correcao" ? "A ETM pediu correções. Avise que viu e que começou a refazer. A mensagem é opcional." : t.ajuda}
        </p>
      )}

      {restaurado && texto && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Recuperamos o texto que você estava escrevendo. Os arquivos precisam ser anexados de novo.
        </p>
      )}

      <textarea
        value={texto}
        onChange={(e) => atualizar({ texto: e.target.value })}
        rows={fase === "aceitar" && modo === "igor" ? 3 : 4}
        maxLength={4000}
        disabled={ocupado}
        placeholder={
          modo === "etm"
            ? aguardando
              ? "Ex.: aos 0:12 trocar a foto; o texto da abertura está com o nome errado."
              : "Escreva uma mensagem..."
            : t.placeholder
        }
        className="field resize-y"
      />

      {mostrarLink && (
        <input
          value={link}
          onChange={(e) => atualizar({ link: e.target.value })}
          type="url"
          disabled={ocupado}
          placeholder={
            fase === "enviar"
              ? "Link final (opcional)"
              : "Link do vídeo (opcional se anexar o arquivo): YouTube vira player na página"
          }
          className="field"
        />
      )}

      {mostrarAnexos && (
        <SeletorArquivos
          limite={limite}
          arquivos={arquivos}
          onChange={setArquivos}
          onErro={setErro}
          disabled={ocupado}
          rotulo={modo === "igor" && fase === "entregar" ? "Anexar vídeo ou arquivos" : "Anexar arquivos"}
        />
      )}

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
            {fase === "aceitar" && (
              <button
                disabled={ocupado}
                onClick={() => rodar(() => mudarStatus(pedidoId, "em_producao", texto, ""))}
                className="btn-dark px-5 py-2.5"
              >
                {status === "correcao" ? "Iniciar correção" : "Iniciar produção"}
              </button>
            )}
            {fase === "entregar" && (
              <button
                disabled={ocupado}
                onClick={() => rodar((a) => entregarVersao(pedidoId, texto, link, a))}
                className="btn-dark px-5 py-2.5"
              >
                Enviar para avaliação
              </button>
            )}
            {fase === "enviar" && (
              <button
                disabled={ocupado}
                onClick={() => rodar(() => mudarStatus(pedidoId, "enviado", texto, link))}
                className="btn-dark px-5 py-2.5"
              >
                Marcar como enviado
              </button>
            )}
            <button
              disabled={ocupado}
              onClick={() => rodar((a) => comentarComoIgor(pedidoId, texto, a))}
              className={fase === "aguardar" || fase === "encerrado" ? "btn-dark px-5 py-2.5" : "btn-outline px-5 py-2.5"}
            >
              Só comentar
            </button>
            {fase !== "encerrado" && (
              <button
                disabled={ocupado}
                onClick={cancelar}
                className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:ml-auto"
              >
                Cancelar pedido
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
