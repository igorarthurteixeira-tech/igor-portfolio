"use client";

import { useSyncExternalStore } from "react";

function assinar(aviso: () => void) {
  const t = setInterval(aviso, 30_000);
  return () => clearInterval(t);
}

/** Hora atual (atualiza sozinha), para a página virar de "Em breve" para o vídeo sem recarregar. */
export function useAgora() {
  return useSyncExternalStore(
    assinar,
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => Date.now(),
  );
}
