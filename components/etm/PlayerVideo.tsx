"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { tempoDeVideo as hora } from "@/lib/etm";

const VELOCIDADES = [1, 1.25, 1.5, 2, 0.5];
const ICONE = "h-5 w-5";

type Props = {
  src: string;
  autoPlay?: boolean;
  /** Classes do cartão do player (ex.: largura). */
  classe?: string;
  /** Classes do vídeo (ex.: altura máxima); em tela cheia ele ocupa tudo. */
  classeVideo?: string;
  /** Pontos com comentário, mostrados como marcas na barra de progresso. */
  marcas?: { segundo: number; feito: boolean }[];
  ref?: React.Ref<ControleDoPlayer>;
};

/** O que quem usa o player pode pedir a ele (ex.: o horário atual para um comentário, ou ir até um momento). */
export type ControleDoPlayer = {
  tempoAtual: () => number;
  irPara: (segundos: number) => void;
  pausar: () => void;
};

/**
 * Player de vídeo com a cara do site (mesmos controles discretos do player da série): botão central, barra preta
 * translúcida, progresso em azul claro, volume, velocidade e tela cheia. Sem o botão de baixar nem o menu do
 * botão direito; o download é o botão "Baixar" do sistema, liberado só depois da aprovação.
 */
export default function PlayerVideo({ src, autoPlay = false, classe = "", classeVideo = "w-full", marcas = [], ref }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useImperativeHandle(
    ref,
    () => ({
      tempoAtual: () => video.current?.currentTime ?? 0,
      irPara: (segundos) => {
        const v = video.current;
        if (!v) return;
        v.currentTime = segundos;
        v.play().catch(() => {});
      },
      pausar: () => video.current?.pause(),
    }),
    [],
  );

  const [tocando, setTocando] = useState(false);
  const [fim, setFim] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [carregado, setCarregado] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mudo, setMudo] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [visivel, setVisivel] = useState(true);
  const [esperando, setEsperando] = useState(false);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === caixa.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => {
      document.removeEventListener("fullscreenchange", aoMudar);
      clearTimeout(timer.current);
    };
  }, []);

  /** Mostra os controles e, se o vídeo estiver tocando, esconde de novo depois de uns segundos parado. */
  function mostrar() {
    setVisivel(true);
    clearTimeout(timer.current);
    if (video.current && !video.current.paused) timer.current = setTimeout(() => setVisivel(false), 2500);
  }

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (v.ended) v.currentTime = 0;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    mostrar();
  }

  function ir(proporcao: number) {
    const v = video.current;
    if (!v || !duracao) return;
    v.currentTime = Math.min(1, Math.max(0, proporcao)) * duracao;
    setTempo(v.currentTime);
    setFim(false);
  }

  function pular(segundos: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.min(duracao, Math.max(0, v.currentTime + segundos));
    setTempo(v.currentTime);
  }

  function posicao(e: React.PointerEvent) {
    const r = barra.current?.getBoundingClientRect();
    return r && r.width ? (e.clientX - r.left) / r.width : 0;
  }

  function alternarSom() {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
  }

  function mudarVolume(x: number) {
    const v = video.current;
    if (!v) return;
    v.volume = x;
    v.muted = x === 0;
  }

  function mudarVelocidade() {
    const v = video.current;
    if (!v) return;
    const proxima = VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length];
    v.playbackRate = proxima;
    setVelocidade(proxima);
  }

  async function alternarTelaCheia() {
    const c = caixa.current;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!c || !v) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else if (c.requestFullscreen) {
      await c.requestFullscreen().catch(() => {});
    } else {
      v.webkitEnterFullscreen?.(); // iPhone: só o vídeo entra em tela cheia
    }
  }

  function tecla(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).closest("button, input")) return;
    const v = video.current;
    if (!v) return;
    const acoes: Record<string, () => void> = {
      " ": alternar,
      k: alternar,
      ArrowRight: () => pular(5),
      ArrowLeft: () => pular(-5),
      ArrowUp: () => mudarVolume(Math.min(1, v.volume + 0.1)),
      ArrowDown: () => mudarVolume(Math.max(0, v.volume - 0.1)),
      m: alternarSom,
      f: () => void alternarTelaCheia(),
    };
    const acao = acoes[e.key];
    if (acao) {
      e.preventDefault();
      acao();
    }
  }

  const pct = duracao ? (tempo / duracao) * 100 : 0;
  const pctCarregado = duracao ? (carregado / duracao) * 100 : 0;
  const controlesAparecem = visivel || !tocando;

  return (
    <div
      ref={caixa}
      tabIndex={0}
      onKeyDown={tecla}
      onMouseMove={mostrar}
      onMouseLeave={() => tocando && setVisivel(false)}
      onTouchStart={mostrar}
      className={`group/player relative overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent-light ${
        telaCheia ? "h-screen w-screen" : `rounded-xl ${classe}`
      } ${tocando && !visivel ? "cursor-none" : ""}`}
    >
      <video
        ref={video}
        src={`${src}#t=0.1`}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onClick={alternar}
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration)}
        onDurationChange={(e) => setDuracao(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const v = e.currentTarget;
          let ate = 0;
          for (let i = 0; i < v.buffered.length; i++) {
            if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) ate = v.buffered.end(i);
          }
          setCarregado(ate);
        }}
        onPlay={() => {
          setTocando(true);
          setFim(false);
          mostrar();
        }}
        onPause={() => {
          setTocando(false);
          setVisivel(true);
          clearTimeout(timer.current);
        }}
        onEnded={() => {
          setFim(true);
          setTocando(false);
          setVisivel(true);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMudo(e.currentTarget.muted || e.currentTarget.volume === 0);
        }}
        onWaiting={() => setEsperando(true)}
        onPlaying={() => setEsperando(false)}
        onCanPlay={() => setEsperando(false)}
        className={telaCheia ? "h-full w-full object-contain" : classeVideo}
      />

      {/* botão grande no centro: aparece com o vídeo parado ou terminado */}
      {(!tocando || fim) && (
        <button
          type="button"
          onClick={alternar}
          aria-label={fim ? "Assistir de novo" : "Assistir"}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition group-hover/player:scale-105 group-hover/player:bg-accent-strong/80">
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
        </button>
      )}

      {esperando && tocando && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-white/25 border-t-accent-light" />
      )}

      {/* controles discretos, como no player da série */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-10 transition-opacity duration-300 ${
          controlesAparecem ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={barra}
          role="slider"
          aria-label="Posição do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracao)}
          aria-valuenow={Math.round(tempo)}
          aria-valuetext={`${hora(tempo)} de ${hora(duracao)}`}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            arrastando.current = true;
            ir(posicao(e));
          }}
          onPointerMove={(e) => {
            if (arrastando.current) ir(posicao(e));
          }}
          onPointerUp={() => (arrastando.current = false)}
          onPointerCancel={() => (arrastando.current = false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") pular(5);
            if (e.key === "ArrowLeft") pular(-5);
          }}
          className="group/barra flex h-6 cursor-pointer touch-none items-center"
        >
          <div className="relative h-1 w-full rounded-full bg-white/25 transition-all group-hover/barra:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${pctCarregado}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent-light" style={{ width: `${pct}%` }} />
            {duracao > 0 &&
              marcas.map((m, i) => (
                <span
                  key={`${m.segundo}-${i}`}
                  aria-hidden
                  title={hora(m.segundo)}
                  className={`absolute top-1/2 h-3 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm ${m.feito ? "bg-emerald-400" : "bg-amber-400"}`}
                  style={{ left: `${Math.min(100, (m.segundo / duracao) * 100)}%` }}
                />
              ))}
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover/barra:opacity-100"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 text-white sm:gap-2">
          <button type="button" onClick={alternar} aria-label={tocando && !fim ? "Pausar" : "Assistir"} className="rounded p-2 hover:bg-white/15">
            <svg viewBox="0 0 24 24" className={ICONE} fill="currentColor" aria-hidden>
              <path d={tocando && !fim ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M6 4l14 8-14 8z"} />
            </svg>
          </button>

          <span className="text-xs tabular-nums text-white/90">
            {hora(tempo)} / {hora(duracao)}
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={mudarVelocidade} aria-label={`Velocidade ${velocidade}x`} className="rounded px-2 py-1.5 text-xs font-semibold tabular-nums hover:bg-white/15">
              {velocidade}x
            </button>
            <button type="button" onClick={alternarSom} aria-label={mudo ? "Ativar som" : "Silenciar"} className="rounded p-2 hover:bg-white/15">
              <svg viewBox="0 0 24 24" className={ICONE} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
                {mudo ? <path d="M16 9l5 6m0-6l-5 6" /> : <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" />}
              </svg>
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={mudo ? 0 : volume}
              onChange={(e) => mudarVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-20 cursor-pointer accent-accent-light sm:block"
            />
            <button type="button" onClick={() => void alternarTelaCheia()} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} className="rounded p-2 hover:bg-white/15">
              <svg viewBox="0 0 24 24" className={ICONE} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={telaCheia ? "M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" : "M4 9V4h5m6 0h5v5M4 15v5h5m11-5v5h-5"} />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
