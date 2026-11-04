"use client";

import { useRef } from "react";
import { EXT_ETM, LIMITE_ARQUIVO_ETM, MAX_ARQUIVOS_ETM, megas, tamanhoLegivel } from "@/lib/etm";

type Props = {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  onErro: (mensagem: string) => void;
  disabled?: boolean;
  rotulo?: string;
  /** Maior arquivo aceito, em bytes (depende de o Google Drive estar conectado). */
  limite?: number;
};

/** Escolhe fotos, vídeos e outros arquivos; avisa na hora se algum passa do limite. */
export default function SeletorArquivos({ arquivos, onChange, onErro, disabled, rotulo = "Anexar arquivos", limite = LIMITE_ARQUIVO_ETM }: Props) {
  const entrada = useRef<HTMLInputElement>(null);

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
          {arquivos.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-page px-3 py-2">
              <span className="min-w-0 truncate text-fg">{a.name}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                {tamanhoLegivel(a.size)}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(arquivos.filter((_, j) => j !== i))}
                  className="font-semibold text-red-600 hover:underline disabled:opacity-40"
                >
                  Remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
