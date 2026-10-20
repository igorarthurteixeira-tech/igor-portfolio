"use client";

import { abrirChat } from "@/lib/chat";

/** Botão que abre o chat do canto da tela. */
export default function BotaoChat({
  children,
  className = "btn-dark",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button onClick={abrirChat} data-track="cta-processo" className={className}>
      {children}
    </button>
  );
}
