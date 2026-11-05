"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dataHora, tempoDeVideo, type ComentarioVideo } from "@/lib/etm";
import { comentarNoVideo, editarComentarioVideo, excluirComentarioVideo } from "@/app/(site)/etm/actions";
import { alternarComentarioFeito } from "@/app/(site)/admin/etm/actions";
import PlayerVideo, { type ControleDoPlayer } from "./PlayerVideo";

type Props = {
  src: string;
  arquivoId: string;
  classeVideo?: string;
  comentarios: ComentarioVideo[];
  /** Pode comentar (e mexer nos próprios comentários ainda não enviados): a ETM, enquanto a versão está em avaliação. */
  podeComentar: boolean;
  /** Pode marcar os pontos como feitos: quem produz. */
  podeResolver: boolean;
  euId: string;
  /** Explica por que ainda não dá para comentar (aparece no lugar do botão). */
  dica?: string;
  autoPlay?: boolean;
};

/**
 * Vídeo entregue com comentários marcados no tempo, como no YouTube: o botão "Comentar neste ponto" guarda o segundo
 * em que o vídeo está, os comentários aparecem como marcas na barra e cada horário leva o vídeo àquele momento.
 * Os comentários ainda não enviados viram a correção quando a ETM clica em "Pedir correção".
 */
export default function VideoComentavel({ src, arquivoId, classeVideo, comentarios, podeComentar, podeResolver, euId, dica, autoPlay }: Props) {
  const router = useRouter();
  const player = useRef<ControleDoPlayer>(null);
  const [novo, setNovo] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const ordenados = [...comentarios].sort((a, b) => a.segundo - b.segundo);

  async function rodar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
    setErro("");
    setOcupado(true);
    const r = await acao();
    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      return false;
    }
    router.refresh();
    return true;
  }

  function abrirNovo() {
    const t = player.current?.tempoAtual() ?? 0;
    player.current?.pausar();
    setErro("");
    setNovo(Math.floor(t * 10) / 10);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (novo === null) return;
    if (await rodar(() => comentarNoVideo(arquivoId, novo, texto))) {
      setNovo(null);
      setTexto("");
    }
  }

  async function salvarEdicao(id: string) {
    if (await rodar(() => editarComentarioVideo(id, textoEdicao))) setEditando(null);
  }

  return (
    <div>
      <PlayerVideo
        ref={player}
        src={src}
        autoPlay={autoPlay}
        classeVideo={classeVideo}
        marcas={ordenados.map((c) => ({ segundo: c.segundo, feito: c.feito }))}
      />

      <div className="space-y-3 border-t border-line bg-white px-3 py-3">
        {podeComentar && novo === null && (
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5h16v11H9l-5 4V5z" />
            </svg>
            Comentar neste ponto do vídeo
          </button>
        )}

        {!podeComentar && dica && (
          <p className="flex items-start gap-2 text-xs text-muted">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5h16v11H9l-5 4V5z" />
            </svg>
            {dica}
          </p>
        )}

        {novo !== null && (
          <form onSubmit={enviar} className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              Comentário em
              <span className="rounded bg-amber-200 px-1.5 py-0.5 tabular-nums">{tempoDeVideo(novo)}</span>
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              maxLength={1000}
              autoFocus
              disabled={ocupado}
              placeholder="O que precisa mudar neste momento?"
              className="field resize-y bg-white text-sm"
            />
            <div className="flex gap-3 text-sm font-semibold">
              <button disabled={ocupado || texto.trim().length < 1} className="rounded-lg bg-amber-500 px-4 py-1.5 text-white hover:bg-amber-600 disabled:opacity-50">
                {ocupado ? "Salvando..." : "Comentar"}
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setNovo(null);
                  setTexto("");
                }}
                className="px-2 py-1.5 text-muted hover:text-fg"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}

        {ordenados.length > 0 && (
          <ul className="space-y-2.5">
            {ordenados.map((c) => {
              const meu = podeComentar && c.autor_id === euId && !c.correcao_evento_id;
              return (
                <li key={c.id} className="flex gap-2.5 text-sm">
                  <button
                    type="button"
                    onClick={() => player.current?.irPara(c.segundo)}
                    title="Ir para este momento"
                    className={`h-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums transition ${
                      c.feito ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    }`}
                  >
                    {tempoDeVideo(c.segundo)}
                  </button>
                  <div className="min-w-0 flex-1">
                    {editando === c.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={textoEdicao}
                          onChange={(e) => setTextoEdicao(e.target.value)}
                          rows={2}
                          maxLength={1000}
                          disabled={ocupado}
                          className="field resize-y bg-white text-sm"
                        />
                        <div className="flex gap-3 text-xs font-semibold">
                          <button type="button" disabled={ocupado} onClick={() => salvarEdicao(c.id)} className="rounded-lg bg-accent-strong px-3 py-1 text-white disabled:opacity-50">
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditando(null)} className="px-2 py-1 text-muted hover:text-fg">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`whitespace-pre-wrap leading-snug ${c.feito ? "text-slate-400 line-through" : "text-fg"}`}>{c.texto}</p>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                      <span>
                        {c.autor_nome} · {dataHora(c.criado_em)}
                        {c.editado_em ? " · editado" : ""}
                      </span>
                      {meu && editando !== c.id && (
                        <>
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => {
                              setTextoEdicao(c.texto);
                              setEditando(c.id);
                            }}
                            className="font-semibold text-accent-strong hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => window.confirm("Excluir este comentário?") && rodar(() => excluirComentarioVideo(c.id))}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                      {podeResolver && (
                        <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-emerald-700">
                          <input
                            type="checkbox"
                            checked={c.feito}
                            disabled={ocupado}
                            onChange={(e) => rodar(() => alternarComentarioFeito(c.id, e.target.checked))}
                            className="h-3.5 w-3.5 accent-emerald-600"
                          />
                          Feito
                        </label>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
