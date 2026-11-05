"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataHora, formatarValor, paraNumeroBR, type ArquivoEnviado, type CobrancaStatus, type StatusPedido } from "@/lib/etm";
import { useRascunho } from "@/lib/etm-rascunho";
import { enviarArquivos, type ProgressoEnvio } from "@/lib/etm-upload";
import { criarUploadUrlEtm, responderPedido } from "@/app/(site)/etm/actions";
import {
  comentarComoIgor,
  criarUploadUrlAdminEtm,
  entregarVersao,
  fazerPergunta,
  iniciarSemCobranca,
  marcarPagamento,
  mudarStatus,
  proporCobranca,
  retirarCobranca,
} from "@/app/(site)/admin/etm/actions";
import SeletorArquivos from "./SeletorArquivos";

type Props = {
  pedidoId: string;
  status: StatusPedido;
  modo: "etm" | "igor";
  limite: number;
  usuarioId: string;
  /** Comentários marcados no vídeo que ainda não foram enviados (a ETM, ao avaliar). */
  notasPendentes?: number;
  /** Situação da cobrança do pedido (visão de quem produz). */
  cobranca?: {
    status: CobrancaStatus;
    valor: number | null;
    aceitaPor: string | null;
    aceitaEm: string | null;
    pagaEm: string | null;
  };
};
type Resp = { ok: true } | { ok: false; erro: string };

/**
 * Em que ponto do fluxo o pedido está, do lado de quem produz:
 * - aceitar: acabou de chegar (ou voltou com pedido de correção); basta avisar que viu e começou;
 * - entregar: em produção; é aqui que se envia o vídeo, passando para a avaliação;
 * - aguardar: a ETM está avaliando;
 * - enviar: a ETM aprovou; falta o envio final;
 * - encerrado: enviado ou cancelado.
 */
type Fase = "aceitar" | "aceite" | "entregar" | "aguardar" | "enviar" | "encerrado";

function faseDe(status: StatusPedido): Fase {
  if (status === "aguardando_aceite") return "aceite";
  if (status === "recebido" || status === "correcao") return "aceitar";
  if (status === "em_producao") return "entregar";
  if (status === "em_avaliacao") return "aguardar";
  if (status === "aprovado") return "enviar";
  return "encerrado";
}

const TEXTOS: Record<Fase, { titulo: string; ajuda: string; placeholder: string }> = {
  aceitar: {
    titulo: "Responder ao pedido",
    ajuda: "Avise a ETM que você viu o pedido e que a produção começou (a mensagem é opcional), ou tire uma dúvida: a pergunta aparece em destaque para a ETM responder.",
    placeholder: "Opcional. Ex.: Recebi o pedido e começo a produção hoje.",
  },
  aceite: {
    titulo: "Aguardando o aceite da cobrança",
    ajuda: "O cliente precisa aceitar a cobrança antes de a produção começar. Ela só será feita ao final do vídeo.",
    placeholder: "Escreva uma mensagem...",
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

export default function AcoesPedido({ pedidoId, status, modo, limite, usuarioId, notasPendentes = 0, cobranca }: Props) {
  const router = useRouter();
  // o que foi digitado sobrevive a uma recarga da página (cada pedido e cada pessoa têm o seu rascunho)
  const { valores, atualizar, restaurado, limpar } = useRascunho(`etm-acao:${usuarioId}:${pedidoId}`, { texto: "", link: "" });
  const { texto, link } = valores;
  const [arquivos, setArquivos] = useState<File[]>([]);
  // cobrança do pedido (só na fase de recebimento): marcar que gera cobrança e informar o valor
  const [geraCobranca, setGeraCobranca] = useState(cobranca?.status === "recusada");
  const [valorTexto, setValorTexto] = useState(cobranca?.valor != null ? String(cobranca.valor).replace(".", ",") : "");
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
  const mostrarAnexos = modo === "etm" || fase === "entregar" || fase === "aguardar" || fase === "aceite" || fase === "encerrado";
  const naRecepcao = modo === "igor" && status === "recebido";
  const cobrancaAceita = naRecepcao && cobranca?.status === "aceita";
  const valorDigitado = paraNumeroBR(valorTexto);

  function enviarCobranca() {
    if (!(valorDigitado > 0)) return setErro("Informe o valor da cobrança.");
    rodar(() => proporCobranca(pedidoId, valorDigitado, texto));
  }

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-fg">
        {modo === "etm" ? (aguardando ? "Avaliar a versão" : "Enviar mensagem") : t.titulo}
      </h2>
      {modo === "etm" && aguardando && (
        <>
          <p className="text-sm text-muted">
            Aprove o vídeo ou peça correções. Para apontar um momento exato, use <strong>Comentar neste ponto do vídeo</strong> no player; se preferir,
            escreva aqui e anexe imagens de referência.
          </p>
          {notasPendentes > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {notasPendentes === 1
                ? "1 comentário marcado no vídeo vai junto com o pedido de correção."
                : `${notasPendentes} comentários marcados no vídeo vão junto com o pedido de correção.`}
            </p>
          )}
        </>
      )}
      {modo === "igor" && (
        <p className="text-sm text-muted">
          {fase === "aceitar" && status === "correcao" ? "A ETM pediu correções. Avise que viu e que começou a refazer. A mensagem é opcional." : t.ajuda}
        </p>
      )}

      {modo === "igor" && cobranca?.status === "aceita" && cobranca.valor != null && status !== "cancelado" && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            cobranca.pagaEm ? "border-emerald-300 bg-emerald-50" : "border-sky-300 bg-sky-50"
          }`}
        >
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-fg">Cobrança de {formatarValor(cobranca.valor)}</p>
            <p className="text-muted">
              {cobranca.pagaEm
                ? `Pagamento recebido em ${dataHora(cobranca.pagaEm)}. O cliente já pode baixar o vídeo final.`
                : "Aguardando o pagamento. O cliente só baixa o vídeo final depois que você marcar o pagamento como recebido."}
            </p>
          </div>
          <button
            disabled={ocupado}
            onClick={() => {
              if (cobranca.pagaEm && !window.confirm("Desfazer o pagamento recebido? O download volta a ficar bloqueado para o cliente.")) return;
              rodar(() => marcarPagamento(pedidoId, !cobranca.pagaEm));
            }}
            className={cobranca.pagaEm ? "btn-outline px-4 py-2" : "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"}
          >
            {cobranca.pagaEm ? "Desfazer" : "Marcar pagamento como recebido"}
          </button>
        </div>
      )}

      {naRecepcao && !cobrancaAceita && (
        <div className="space-y-3 rounded-xl border border-line bg-page p-4">
          {cobranca?.status === "recusada" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              O cliente recusou a cobrança{cobranca.valor != null ? ` de ${formatarValor(cobranca.valor)}` : ""}. Ajuste o valor e reenvie, ou inicie a produção sem cobrança.
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg">
            <input
              type="checkbox"
              checked={geraCobranca}
              onChange={(e) => setGeraCobranca(e.target.checked)}
              disabled={ocupado}
              className="h-4 w-4 accent-accent-strong"
            />
            Este vídeo gera cobrança
          </label>
          {geraCobranca && (
            <div className="space-y-1.5">
              <label htmlFor="valor-cobranca" className="block text-sm font-semibold text-fg">Valor (R$)</label>
              <input
                id="valor-cobranca"
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                disabled={ocupado}
                placeholder="Ex.: 500,00"
                className="field max-w-48"
              />
              <p className="text-xs text-muted">
                O cliente verá o valor e precisará aceitar antes de a produção começar. Fica avisado de que a cobrança só será feita ao final do vídeo.
              </p>
            </div>
          )}
        </div>
      )}

      {cobrancaAceita && cobranca && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Cobrança de {formatarValor(cobranca.valor ?? 0)} aceita{cobranca.aceitaPor ? ` por ${cobranca.aceitaPor}` : ""}
          {cobranca.aceitaEm ? ` em ${dataHora(cobranca.aceitaEm)}` : ""}. Já pode iniciar a produção; a cobrança só é feita ao final.
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
            {fase === "aceitar" && naRecepcao && geraCobranca && !cobrancaAceita && (
              <button disabled={ocupado} onClick={enviarCobranca} className="btn-dark px-5 py-2.5">
                Enviar cobrança para aceite
              </button>
            )}
            {fase === "aceitar" && naRecepcao && !geraCobranca && cobranca?.status === "recusada" && (
              <button disabled={ocupado} onClick={() => rodar(() => iniciarSemCobranca(pedidoId, texto))} className="btn-dark px-5 py-2.5">
                Iniciar produção sem cobrança
              </button>
            )}
            {fase === "aceitar" && !(naRecepcao && (geraCobranca || cobranca?.status === "recusada") && !cobrancaAceita) && (
              <button
                disabled={ocupado}
                onClick={() => rodar(() => mudarStatus(pedidoId, "em_producao", texto, ""))}
                className="btn-dark px-5 py-2.5"
              >
                {status === "correcao" ? "Iniciar correção" : "Iniciar produção"}
              </button>
            )}
            {fase === "aceite" && (
              <button
                disabled={ocupado}
                onClick={() => window.confirm("Retirar a cobrança? O pedido volta a Recebido, sem cobrança.") && rodar(() => retirarCobranca(pedidoId))}
                className="btn-outline px-5 py-2.5"
              >
                Retirar cobrança
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
            {(fase === "aceitar" || fase === "entregar") && (
              <button
                disabled={ocupado}
                onClick={() => rodar(() => fazerPergunta(pedidoId, texto))}
                className="rounded-xl border border-amber-400 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Fazer pergunta à ETM
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
              className={fase === "aguardar" || fase === "aceite" || fase === "encerrado" ? "btn-dark px-5 py-2.5" : "btn-outline px-5 py-2.5"}
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
