"use client";

/**
 * Imagem e vídeo sem o menu do botão direito ("Salvar como...") e sem arrastar para salvar.
 * É só um obstáculo no navegador: o jeito normal de baixar passa a ser o botão "Baixar" do sistema,
 * que só aparece depois da aprovação.
 */
export function VideoProtegido({ src, className, semBaixar = true }: { src: string; className?: string; semBaixar?: boolean }) {
  return (
    <video
      controls
      preload="metadata"
      src={src}
      controlsList={semBaixar ? "nodownload" : undefined}
      onContextMenu={(e) => e.preventDefault()}
      className={className}
    />
  );
}

export function ImagemProtegida({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" draggable={false} onContextMenu={(e) => e.preventDefault()} className={`select-none ${className ?? ""}`} />
  );
}
