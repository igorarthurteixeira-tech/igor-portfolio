"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Evento } from "@/lib/etm";
import { editarMensagem, excluirMensagem } from "@/app/(site)/etm/actions";

/** Texto de uma mensagem, pergunta ou resposta, com os botões de editar e excluir para quem tem permissão. */
export default function MensagemEditavel({
  eventoId,
  tipo,
  texto,
  podeEditar,
  podeExcluir,
  temArquivos,
}: {
  eventoId: string;
  tipo: Evento["tipo"];
  texto: string;
  podeEditar: boolean;
  podeExcluir: boolean;
  temArquivos: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [novo, setNovo] = useState(texto);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    setErro("");
    setOcupado(true);
    const r = await editarMensagem(eventoId, novo);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setEditando(false);
    router.refresh();
  }

  async function excluir() {
    const aviso =
      tipo === "duvida"
        ? "Excluir esta pergunta? As respostas dela também serão apagadas."
        : tipo === "resposta"
          ? "Excluir esta resposta? A pergunta volta a ficar sem resposta."
          : "Excluir esta mensagem?";
    if (!window.confirm(`${aviso}${temArquivos ? " Os arquivos anexados a ela também serão apagados." : ""}`)) return;
    setErro("");
    setOcupado(true);
    const r = await excluirMensagem(eventoId);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.refresh();
  }

  return (
    <div className="mt-2">
      {editando ? (
        <div className="space-y-2">
          <textarea
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            rows={4}
            maxLength={4000}
            disabled={ocupado}
            autoFocus
            className="field resize-y bg-white"
          />
          <div className="flex gap-3 text-sm font-semibold">
            <button type="button" onClick={salvar} disabled={ocupado} className="rounded-lg bg-accent-strong px-4 py-1.5 text-white hover:bg-accent disabled:opacity-50">
              {ocupado ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setErro("");
              }}
              disabled={ocupado}
              className="px-2 py-1.5 text-muted hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {texto && <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{texto}</p>}
          <div className="mt-2 flex gap-3 text-xs font-semibold">
            {podeEditar && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setNovo(texto);
                  setEditando(true);
                }}
                className="text-accent-strong hover:underline disabled:opacity-50"
              >
                Editar
              </button>
            )}
            {podeExcluir && (
              <button type="button" disabled={ocupado} onClick={excluir} className="text-red-600 hover:underline disabled:opacity-50">
                {ocupado ? "Excluindo..." : "Excluir"}
              </button>
            )}
          </div>
        </>
      )}
      {erro && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
