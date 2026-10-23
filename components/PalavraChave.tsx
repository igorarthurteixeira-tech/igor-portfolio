"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const PALAVRA = "desenvolvedor";
const PAUSA_MS = 2500;

/** Há uma caixa de texto ativa? Nesse caso o que se digita não conta como palavra-chave. */
function digitandoEmCampo(alvo: EventTarget | null) {
  for (const el of [alvo, document.activeElement]) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.isContentEditable || el.closest("[contenteditable='true'], [role='textbox']")) return true;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
    if (el instanceof HTMLInputElement) {
      const tipo = el.type;
      if (!["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(tipo)) return true;
    }
  }
  return false;
}

/**
 * Atalho para o painel: digitar "desenvolvedor" em qualquer página, sem estar numa caixa de texto,
 * abre /admin. Quem não tem sessão ativa cai no login (a proteção é a do servidor, não esta palavra).
 */
export default function PalavraChave() {
  const router = useRouter();
  const caminho = usePathname();

  useEffect(() => {
    if (caminho.startsWith("/admin")) return;
    let digitado = "";
    let ultima = 0;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (digitandoEmCampo(e.target)) {
        digitado = "";
        return;
      }
      const agora = Date.now();
      if (agora - ultima > PAUSA_MS) digitado = "";
      ultima = agora;

      if (e.key === "Backspace") digitado = digitado.slice(0, -1);
      else if (e.key.length === 1) digitado = (digitado + e.key.toLowerCase()).slice(-PALAVRA.length);
      else return;

      if (digitado === PALAVRA) {
        digitado = "";
        router.push("/admin");
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [caminho, router]);

  return null;
}
