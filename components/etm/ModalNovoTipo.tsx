"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TipoVideo } from "@/lib/etm";
import { criarTipo } from "@/app/(site)/etm/actions";

/** Mini modal para criar um tipo de pedido: nome e uma descrição de para que ele serve. */
export default function ModalNovoTipo({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: (tipo: TipoVideo) => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campoNome = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoNome.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", tecla);
    // a página de trás não rola enquanto o modal está aberto
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [onFechar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const r = await criarTipo(nome, descricao);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    onCriado(r.tipo);
  }

  // fora do bloco da página: ali dentro o menu fixo do site ficaria por cima da janela
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#050f3d]/60 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !salvando && onFechar()}
    >
      <form
        onSubmit={criar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novo-tipo"
        className="card w-full max-w-md space-y-4 p-6 shadow-2xl"
      >
        <div>
          <h2 id="titulo-novo-tipo" className="text-xl font-bold tracking-tight text-fg">Novo tipo de pedido</h2>
          <p className="mt-1 text-sm text-muted">O tipo fica salvo e aparece na lista dos próximos pedidos.</p>
        </div>

        <div>
          <label htmlFor="novo-tipo-nome" className="mb-1.5 block text-sm font-semibold text-fg">Nome do tipo</label>
          <input
            id="novo-tipo-nome"
            ref={campoNome}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={40}
            required
            placeholder="Ex.: Apresentação de slides"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="novo-tipo-descricao" className="mb-1.5 block text-sm font-semibold text-fg">Para que serve</label>
          <textarea
            id="novo-tipo-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={200}
            required
            minLength={10}
            rows={3}
            placeholder="Explique em uma ou duas frases o que é esse tipo de pedido e quando usar."
            className="field resize-none"
          />
          <p className="mt-1 text-right text-xs text-muted">{descricao.length}/200</p>
        </div>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" disabled={salvando} onClick={onFechar} className="btn-outline px-5 py-2.5">
            Cancelar
          </button>
          <button disabled={salvando} className="btn-dark px-5 py-2.5">
            {salvando ? "Criando..." : "Criar tipo"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
