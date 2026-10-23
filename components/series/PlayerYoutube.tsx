"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Parte da API de player do YouTube que usamos. */
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(segundos: number, permitirBusca: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type YTApi = {
  Player: new (
    el: HTMLElement,
    opcoes: {
      videoId: string;
      host?: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPronta: Promise<YTApi> | null = null;
function carregarApi(): Promise<YTApi> {
  if (!apiPronta) {
    apiPronta = new Promise((resolve) => {
      if (window.YT?.Player) return resolve(window.YT);
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        anterior?.();
        resolve(window.YT as YTApi);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiPronta;
}

// O YouTube desenha o título (em cima) e os controles/marcas do Shorts (embaixo) nas bordas do iframe;
// medido em teste: ~70 px em cima e ~140 px embaixo.
// O iframe é maior que a área visível e deslocado, então essas faixas ficam recortadas.
const FAIXA = 150;

const hora = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Player do YouTube sem a interface do YouTube por cima: só o vídeo e controles discretos. */
export default function PlayerYoutube({
  videoId,
  titulo,
  onAnterior,
  onProximo,
}: {
  videoId: string;
  titulo: string;
  onAnterior?: () => void;
  onProximo?: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const alvo = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [pronto, setPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [fim, setFim] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  // "Tela cheia" própria (a página cobre a tela toda): o iPhone não deixa um <div> entrar em tela cheia nativa.
  const [telaCheia, setTelaCheia] = useState(false);
  const nativa = useRef(false);

  useEffect(() => {
    let vivo = true;
    carregarApi().then((YT) => {
      if (!vivo || !alvo.current) return;
      player.current = new YT.Player(alvo.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            if (!vivo) return;
            setPronto(true);
            setDuracao(player.current?.getDuration() ?? 0);
          },
          onStateChange: (e) => {
            if (!vivo) return;
            setTocando(e.data === 1 || e.data === 3);
            setFim(e.data === 0);
            if (e.data === 1) setDuracao(player.current?.getDuration() ?? 0);
          },
        },
      });
    });
    return () => {
      vivo = false;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  // Atualiza a barra de progresso enquanto toca.
  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => setTempo(player.current?.getCurrentTime() ?? 0), 250);
    return () => clearInterval(t);
  }, [tocando]);

  // Saiu da tela cheia nativa pelo gesto do sistema (voltar, deslizar): sai do modo também.
  useEffect(() => {
    const mudou = () => {
      if (!document.fullscreenElement && nativa.current) {
        nativa.current = false;
        setTelaCheia(false);
      }
    };
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);

  // Esc sai da tela cheia antes de fechar o player.
  useEffect(() => {
    if (!telaCheia) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      sairTelaCheia();
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [telaCheia]);

  const alternar = useCallback(() => {
    const p = player.current;
    if (!p || !pronto) return;
    if (fim) {
      p.seekTo(0, true);
      p.playVideo();
    } else if (tocando) p.pauseVideo();
    else p.playVideo();
  }, [pronto, tocando, fim]);

  function buscar(e: React.MouseEvent<HTMLDivElement>) {
    const p = player.current;
    if (!p || duracao <= 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const alvoTempo = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duracao;
    p.seekTo(alvoTempo, true);
    setTempo(alvoTempo);
  }

  function alternarSom() {
    const p = player.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMudo(false);
    } else {
      p.mute();
      setMudo(true);
    }
  }

  function entrarTelaCheia() {
    setTelaCheia(true);
    const el = caixa.current;
    if (el?.requestFullscreen) {
      nativa.current = true;
      el.requestFullscreen().catch(() => {
        nativa.current = false;
      });
    }
  }

  function sairTelaCheia() {
    nativa.current = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setTelaCheia(false);
  }

  const pct = duracao > 0 ? Math.min(100, (tempo / duracao) * 100) : 0;
  const icone = "h-5 w-5";

  return (
    <div
      ref={caixa}
      className={`overflow-hidden bg-black ${telaCheia ? "fixed inset-0 z-[80]" : "absolute inset-0"}`}
      aria-label={titulo}
    >
      <div
        className={
          telaCheia
            ? "absolute left-1/2 top-1/2 aspect-[9/16] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            : "absolute inset-0"
        }
        style={telaCheia ? { height: "min(100%, 177.78vw)" } : undefined}
      >
      <div
        className="pointer-events-none absolute left-0 w-full"
        style={{ top: -FAIXA, height: `calc(100% + ${FAIXA * 2}px)` }}
      >
        <div ref={alvo} className="h-full w-full" />
      </div>

      {telaCheia && (
        <button
          onClick={sairTelaCheia}
          aria-label="Sair da tela cheia"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl text-white backdrop-blur-sm"
        >
          ✕
        </button>
      )}

      {/* toque no vídeo: toca/pausa (o iframe não recebe cliques, então a interface do YouTube não aparece) */}
      <button
        onClick={alternar}
        aria-label={fim ? "Assistir de novo" : tocando ? "Pausar" : "Continuar"}
        className="absolute inset-0 flex items-center justify-center"
      >
        {(!tocando || fim) && pronto && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            {fim ? (
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8" fill="currentColor" aria-hidden>
                <path d="M6 4l14 8-14 8z" />
              </svg>
            )}
          </span>
        )}
      </button>

      {/* controles discretos */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
        <div
          role="slider"
          aria-label="Posição do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracao)}
          aria-valuenow={Math.round(tempo)}
          tabIndex={0}
          onClick={buscar}
          onKeyDown={(e) => {
            const p = player.current;
            if (!p) return;
            if (e.key === "ArrowRight") p.seekTo(Math.min(duracao, tempo + 5), true);
            if (e.key === "ArrowLeft") p.seekTo(Math.max(0, tempo - 5), true);
          }}
          className="group flex h-6 cursor-pointer items-center"
        >
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/30 transition-all group-hover:h-1.5">
            <div className="h-full rounded-full bg-accent-light" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-white">
          <button onClick={alternar} aria-label={tocando ? "Pausar" : "Tocar"} className="rounded p-2 hover:bg-white/15">
            {tocando && !fim ? (
              <svg viewBox="0 0 24 24" className={icone} fill="currentColor" aria-hidden>
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className={icone} fill="currentColor" aria-hidden>
                <path d="M6 4l14 8-14 8z" />
              </svg>
            )}
          </button>
          {onAnterior && (
            <button onClick={onAnterior} aria-label="Episódio anterior" className="rounded p-2 hover:bg-white/15">
              <svg viewBox="0 0 24 24" className={icone} fill="currentColor" aria-hidden>
                <path d="M6 5h2v14H6zM20 5v14L9 12z" />
              </svg>
            </button>
          )}
          {onProximo && (
            <button onClick={onProximo} aria-label="Próximo episódio" className="rounded p-2 hover:bg-white/15">
              <svg viewBox="0 0 24 24" className={icone} fill="currentColor" aria-hidden>
                <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
              </svg>
            </button>
          )}
          <span className="text-xs tabular-nums text-white/90">
            {hora(tempo)} / {hora(duracao)}
          </span>
          <button onClick={alternarSom} aria-label={mudo ? "Ativar som" : "Silenciar"} className="ml-auto rounded p-2 hover:bg-white/15">
            <svg viewBox="0 0 24 24" className={icone} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
              {mudo ? <path d="M16 9l5 6m0-6l-5 6" /> : <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" />}
            </svg>
          </button>
          <button
            onClick={telaCheia ? sairTelaCheia : entrarTelaCheia}
            aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            className="rounded p-2 hover:bg-white/15"
          >
            <svg viewBox="0 0 24 24" className={icone} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={telaCheia ? "M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" : "M4 9V4h5m6 0h5v5M4 15v5h5m11-5v5h-5"} />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
