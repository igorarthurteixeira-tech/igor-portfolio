"use client";

import { useEffect, useRef, useState } from "react";
import { EXT_ETM, LIMITE_ARQUIVO_ETM, MAX_ARQUIVOS_ETM, megas, tamanhoLegivel } from "@/lib/etm";
import ModalImagem from "./ModalImagem";

type Props = {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  onErro: (mensagem: string) => void;
  disabled?: boolean;
  rotulo?: string;
  /** Maior arquivo aceito, em bytes (depende de o Google Drive estar conectado). */
  limite?: number;
};

// cópia marcada -> imagem original de que ela veio
const ORIGEM = new WeakMap<File, File>();

// o navegador mostra estes formatos; HEIC (foto de iPhone) não aparece, então fica sem ver nem marcar
const PREVISUALIZAVEL = /\.(jpe?g|png|webp)$/i;
const ehImagem = (f: File) => PREVISUALIZAVEL.test(f.name);

/** Miniatura da imagem, gerada em tamanho pequeno (uma foto de celular inteira pesaria na tela). */
function Miniatura({ arquivo, onClick }: { arquivo: File; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    createImageBitmap(arquivo, { resizeWidth: 96, resizeQuality: "medium" })
      .then((bmp) => {
        if (!ativo) return bmp.close();
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext("2d")?.drawImage(bmp, 0, 0);
        bmp.close();
        setUrl(c.toDataURL("image/jpeg", 0.7));
      })
      .catch(() => {
        // sem miniatura: o botão continua abrindo a imagem
      });
    return () => {
      ativo = false;
    };
  }, [arquivo]);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver imagem"
      aria-label={`Ver ${arquivo.name}`}
      className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-line bg-white transition hover:border-accent-strong"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}

const ACAO = "font-semibold text-accent-strong hover:underline disabled:opacity-40";

/**
 * Escolhe fotos, vídeos e outros arquivos; avisa na hora se algum passa do limite.
 * Nas imagens dá para ver em tela grande e desenhar por cima com caneta: ao salvar a marcação, a imagem original
 * e a marcada seguem as duas no envio.
 */
export default function SeletorArquivos({ arquivos, onChange, onErro, disabled, rotulo = "Anexar arquivos", limite = LIMITE_ARQUIVO_ETM }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<{ arquivo: File; modo: "ver" | "marcar" } | null>(null);

  function escolher(lista: FileList | null) {
    if (!lista) return;
    const novos: File[] = [];
    for (const f of Array.from(lista)) {
      const ext = (f.name.split(".").pop() ?? "").toLowerCase();
      if (!EXT_ETM.includes(ext)) {
        onErro(`"${f.name}": tipo não aceito. Use ${EXT_ETM.join(", ")}.`);
        continue;
      }
      if (f.size > limite) {
        onErro(`"${f.name}" passa de ${megas(limite)} MB. Cole o link de uma pasta (Drive, OneDrive...) no campo de link.`);
        continue;
      }
      novos.push(f);
    }
    const todos = [...arquivos, ...novos].slice(0, MAX_ARQUIVOS_ETM);
    if (arquivos.length + novos.length > MAX_ARQUIVOS_ETM) onErro(`No máximo ${MAX_ARQUIVOS_ETM} arquivos por vez.`);
    onChange(todos);
    if (entrada.current) entrada.current.value = "";
  }

  /** Remove o arquivo; se for uma original, leva junto a cópia marcada dela. */
  function remover(f: File) {
    onChange(arquivos.filter((x) => x !== f && ORIGEM.get(x) !== f));
  }

  /** Coloca a cópia marcada logo abaixo da original, trocando a anterior se já houver uma. */
  function guardarMarcada(original: File, marcada: File) {
    const jaTinha = arquivos.some((x) => ORIGEM.get(x) === original);
    if (!jaTinha && arquivos.length >= MAX_ARQUIVOS_ETM) {
      onErro(`O limite é de ${MAX_ARQUIVOS_ETM} arquivos: remova algum antes de salvar a marcação.`);
      return;
    }
    if (marcada.size > limite) {
      onErro(`A imagem marcada passa de ${megas(limite)} MB.`);
      return;
    }
    ORIGEM.set(marcada, original);
    const semAntiga = arquivos.filter((x) => ORIGEM.get(x) !== original);
    const i = semAntiga.indexOf(original);
    onChange([...semAntiga.slice(0, i + 1), marcada, ...semAntiga.slice(i + 1)]);
    setModal(null);
  }

  return (
    <div>
      <input
        ref={entrada}
        type="file"
        multiple
        hidden
        accept={EXT_ETM.map((e) => `.${e}`).join(",")}
        onChange={(e) => escolher(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || arquivos.length >= MAX_ARQUIVOS_ETM}
        onClick={() => entrada.current?.click()}
        className="btn-outline px-4 py-2.5"
      >
        {rotulo}
      </button>

      {arquivos.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {arquivos.map((a, i) => {
            const original = ORIGEM.get(a);
            const temMarcada = !original && arquivos.some((x) => ORIGEM.get(x) === a);
            return (
              <li
                key={`${a.name}-${i}`}
                className={`flex items-center gap-3 rounded-lg bg-page px-3 py-2 ${original ? "ml-6 border-l-2 border-amber-400" : ""}`}
              >
                {ehImagem(a) && <Miniatura arquivo={a} onClick={() => setModal({ arquivo: a, modo: "ver" })} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg">{a.name}</span>
                  {original && <span className="text-xs font-semibold text-amber-700">Cópia com marcação · a original também vai</span>}
                  {temMarcada && <span className="text-xs font-semibold text-amber-700">Tem marcação</span>}
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted">
                  {tamanhoLegivel(a.size)}
                  {ehImagem(a) && (
                    <button type="button" disabled={disabled} onClick={() => setModal({ arquivo: a, modo: "ver" })} className={ACAO}>
                      Ver
                    </button>
                  )}
                  {ehImagem(a) && !original && (
                    <button type="button" disabled={disabled} onClick={() => setModal({ arquivo: a, modo: "marcar" })} className={ACAO}>
                      {temMarcada ? "Refazer marcação" : "Marcar"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => remover(a)}
                    className="font-semibold text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remover
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {modal && (
        <ModalImagem
          arquivo={modal.arquivo}
          modoInicial={modal.modo}
          onFechar={() => setModal(null)}
          onMarcada={ORIGEM.has(modal.arquivo) ? undefined : (m) => guardarMarcada(modal.arquivo, m)}
        />
      )}
    </div>
  );
}
