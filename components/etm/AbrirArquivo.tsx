"use client";

import { useEffect, useState } from "react";
import { ehImagem, ehPdf, ehVideo, type ComentarioVideo } from "@/lib/etm";
import PlayerVideo from "./PlayerVideo";
import VideoComentavel from "./VideoComentavel";

/** Dados dos comentários no tempo do vídeo, quando o arquivo é uma versão entregue. */
export type Comentavel = {
  arquivoId: string;
  comentarios: ComentarioVideo[];
  podeComentar: boolean;
  podeResolver: boolean;
  euId: string;
  dica?: string;
};

/**
 * Abre um arquivo (imagem, vídeo ou PDF) numa janela por cima da própria página, sem sair dela nem abrir outra aba.
 * Os filhos são o botão que abre; `urlBaixar` vazio esconde o botão de baixar (download bloqueado).
 */
export default function AbrirArquivo({
  url,
  nome,
  urlBaixar,
  comentavel,
  className,
  children,
}: {
  url: string;
  nome: string;
  urlBaixar: string | null;
  /** Com isto, o vídeo abre com a lista de comentários marcados no tempo. */
  comentavel?: Comentavel;
  className?: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={className}>
        {children}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={nome}
          className="fixed inset-0 z-[90] flex flex-col gap-3 bg-[#050f3d]/95 p-3 sm:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold text-white">{nome}</p>
            <div className="flex gap-2">
              {urlBaixar && (
                <a href={urlBaixar} className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                  Baixar
                </a>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#050f3d] hover:bg-blue-100"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className={`flex min-h-0 flex-1 justify-center overflow-auto ${ehVideo(nome) && comentavel ? "items-start" : "items-center"}`} onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}>
            {ehImagem(nome) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={nome}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
              />
            )}
            {ehVideo(nome) &&
              (comentavel ? (
                <div className="w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl">
                  <VideoComentavel
                    src={url}
                    autoPlay
                    classeVideo="max-h-[calc(100dvh-18rem)] w-full"
                    {...comentavel}
                  />
                </div>
              ) : (
                <PlayerVideo
                  src={url}
                  autoPlay
                  classe="shadow-2xl"
                  classeVideo="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-3rem)]"
                />
              ))}
            {ehPdf(nome) && <iframe src={url} title={nome} className="h-full w-full max-w-5xl rounded-lg bg-white shadow-2xl" />}
          </div>
        </div>
      )}
    </>
  );
}
