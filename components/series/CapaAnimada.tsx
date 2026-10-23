"use client";

import { useEffect, useState } from "react";
import type { ChatSerie } from "@/lib/series";

const CORES = ["#b45309", "#047857", "#7e22ce", "#be123c", "#1d4ed8"];
const corDe = (nome: string) => CORES[[...nome].reduce((n, c) => n + c.charCodeAt(0), 0) % CORES.length];

/**
 * Bolhas de chat em tamanho grande, no fundo da hero. O lugar de cada mensagem é reservado desde o
 * início (nada se desloca quando uma nova chega): ela só ganha opacidade e desliza para o lugar,
 * depois de um "digitando…" no mesmo ponto. No fim, a conversa some devagar e recomeça.
 * Quem prefere menos movimento vê tudo pronto.
 */
export default function CapaAnimada({ chat }: { chat: ChatSerie }) {
  const total = chat.mensagens.length;
  const [visiveis, setVisiveis] = useState(0);
  const [digitandoEm, setDigitandoEm] = useState<number | null>(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const depois = (ms: number, fn: () => void) => timers.push(setTimeout(() => vivo && fn(), ms));
    const limpar = () => {
      vivo = false;
      timers.forEach(clearTimeout);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      depois(0, () => setVisiveis(total));
      return limpar;
    }

    function mensagem(i: number) {
      if (i >= total) {
        depois(4800, () => {
          setSaindo(true);
          depois(1100, () => {
            setVisiveis(0);
            depois(300, () => {
              setSaindo(false);
              depois(900, () => mensagem(0));
            });
          });
        });
        return;
      }
      setDigitandoEm(i);
      depois(1400 + Math.min(chat.mensagens[i].texto.length * 25, 1000), () => {
        setDigitandoEm(null);
        setVisiveis(i + 1);
        depois(1100, () => mensagem(i + 1));
      });
    }
    depois(900, () => mensagem(0));
    return limpar;
  }, [total, chat.mensagens]);

  const entrada = (mostrar: boolean) =>
    `transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
      mostrar ? "translate-y-0 scale-100 opacity-100" : "translate-y-10 scale-95 opacity-0"
    }`;

  return (
    <div
      aria-hidden
      className={`pointer-events-none flex w-[640px] -rotate-6 select-none flex-col gap-4 transition-opacity duration-1000 ease-in-out ${
        saindo ? "opacity-0" : "opacity-100"
      }`}
    >
      {chat.mensagens.map((m, i) => {
        const direita = m.lado === "out";
        return (
          <div key={i} className={`relative max-w-[88%] ${direita ? "self-end" : "self-start"}`}>
            {digitandoEm === i && (
              <div
                className={`absolute top-0 flex gap-2 rounded-3xl bg-white px-7 py-5 shadow-xl shadow-black/30 ${
                  direita ? "right-0" : "left-0"
                }`}
              >
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-3 w-3 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            )}
            {m.arquivo ? (
              <div
                className={`w-fit rounded-2xl bg-[#fff3c4] px-6 py-3 text-xl font-bold text-amber-900 shadow-xl shadow-black/30 ${entrada(i < visiveis)}`}
              >
                {m.texto}
              </div>
            ) : (
              <div
                className={`rounded-3xl px-7 py-5 text-[28px] leading-tight text-slate-800 shadow-xl shadow-black/30 ${
                  direita ? "bg-[#dcf8c6]" : "bg-white"
                } ${entrada(i < visiveis)}`}
              >
                {m.autor && (
                  <p className="mb-1 text-xl font-bold" style={{ color: corDe(m.autor) }}>
                    {m.autor}
                    {m.cargo && <span className="font-normal text-slate-500"> · {m.cargo}</span>}
                  </p>
                )}
                {m.texto}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
