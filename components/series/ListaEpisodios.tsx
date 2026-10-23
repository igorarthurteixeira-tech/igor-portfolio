"use client";

import Image from "next/image";
import { useState } from "react";
import { diaDaEstreia, estaDisponivel, type Serie } from "@/lib/series";
import { useAgora } from "./useAgora";
import PlayerEpisodio from "./PlayerEpisodio";

/** Cartões dos episódios, numerados da esquerda para a direita (episódio 1 primeiro). */
export default function ListaEpisodios({ serie }: { serie: Serie }) {
  const [aberto, setAberto] = useState<number | null>(null);
  // ao trocar de episódio com o player tocando, o próximo já começa
  const [seguirTocando, setSeguirTocando] = useState(false);
  const ordem = [...serie.episodios].sort((a, b) => a.numero - b.numero);
  const episodio = ordem.find((e) => e.numero === aberto);
  const posicao = episodio ? ordem.indexOf(episodio) : -1;
  const ir = (i: number, tocando: boolean) => {
    setSeguirTocando(tocando);
    setAberto(ordem[i].numero);
  };
  const producao = process.env.NODE_ENV === "production";
  const agora = useAgora();

  return (
    <>
      <ul className="flex flex-wrap justify-center gap-4">
        {[...serie.episodios]
          .sort((a, b) => a.numero - b.numero)
          .map((ep) => {
            const disponivel = estaDisponivel(ep, agora, producao);
            const dia = diaDaEstreia(ep);
            return (
              <li key={ep.numero} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.7rem)] lg:w-[210px]">
                <button
                  onClick={() => {
                    setSeguirTocando(false);
                    setAberto(ep.numero);
                  }}
                  data-track={`serie:${serie.slug}:${ep.numero}:abrir`}
                  className="card card-hover group block w-full overflow-hidden text-left"
                  aria-label={disponivel ? `Episódio ${ep.numero}: ${ep.titulo}` : `Episódio ${ep.numero}, em breve`}
                >
                  <div className="relative aspect-[9/16] w-full bg-brand">
                    <Image
                      src={ep.poster}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 280px, (min-width:640px) 30vw, 46vw"
                      className={`object-cover transition duration-500 ${
                        disponivel ? "group-hover:scale-[1.03]" : "scale-110 blur-lg"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                    <span className="absolute left-3 top-3 rounded-lg bg-brand/90 px-3 py-1.5 text-sm font-extrabold tracking-wider text-white">
                      EP {ep.numero}
                    </span>
                    <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                      {ep.duracao}
                    </span>
                    {disponivel && (
                      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-strong/95 text-white shadow-xl shadow-accent/40 transition group-hover:scale-110">
                        <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
                          <path d="M6 4l14 8-14 8z" />
                        </svg>
                      </span>
                    )}
                    {!disponivel && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Em breve{dia ? ` · ${dia}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className={`text-sm font-semibold leading-snug ${disponivel ? "text-fg" : "text-slate-500"}`}>
                      {disponivel ? ep.titulo : `Episódio ${ep.numero}`}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
      </ul>

      {episodio && (
        <PlayerEpisodio
          key={episodio.numero}
          serie={serie}
          episodio={episodio}
          onFechar={() => setAberto(null)}
          comecarTocando={seguirTocando}
          onAnterior={posicao > 0 ? (t) => ir(posicao - 1, t) : undefined}
          onProximo={posicao < ordem.length - 1 ? (t) => ir(posicao + 1, t) : undefined}
        />
      )}
    </>
  );
}
