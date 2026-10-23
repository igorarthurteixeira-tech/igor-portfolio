"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { diaDaEstreia, estaDisponivel, idEpisodio, type Episodio, type Serie } from "@/lib/series";
import { useAgora } from "./useAgora";
import PlayerYoutube from "./PlayerYoutube";
import { useInteracao } from "./useInteracao";

/** Área de 9:16 centrada na tela: o vídeo (ou a capa) nunca é cortado, sobram faixas pretas nas bordas. */
const QUADRO = "absolute left-1/2 top-1/2 aspect-[9/16] -translate-x-1/2 -translate-y-1/2 overflow-hidden";
const ALTURA_QUADRO = { height: "min(100%, 177.78vw)" };

function Coracao({ cheio }: { cheio: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden fill={cheio ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.6 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.4 3.2 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
    </svg>
  );
}

function Balao() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}

function Enviar() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M21 3L3 10.5l7 3 3 7L21 3zM10 13.5L21 3" />
    </svg>
  );
}

/** Curtir, comentar, compartilhar e legenda: só montado no episódio que está na tela. */
function Painel({ serie, ep }: { serie: Serie; ep: Episodio }) {
  const { estado, curtir, comentar } = useInteracao(idEpisodio(serie.slug, ep.numero));
  const [legendaAberta, setLegendaAberta] = useState(false);
  const [comentarios, setComentarios] = useState(false);
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [isca, setIsca] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    const r = await comentar(nome, texto, isca);
    if (r.ok) {
      setNome("");
      setTexto("");
    }
    setMsg(r);
    setEnviando(false);
  }

  async function compartilhar() {
    const url = `${window.location.origin}/vida-de-dono/${serie.slug}`;
    const titulo = `${serie.titulo} · Episódio ${ep.numero}: ${ep.titulo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado");
      setTimeout(() => setAviso(""), 2000);
    } catch {
      // o próprio usuário cancelou o compartilhamento
    }
  }

  const acao =
    "pointer-events-auto flex flex-col items-center gap-1 text-xs font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]";

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/75 to-transparent" />

      <div className="absolute bottom-10 right-3 z-20 flex flex-col items-center gap-5">
        <button onClick={curtir} aria-pressed={estado.jaCurtiu} aria-label="Curtir" className={`${acao} ${estado.jaCurtiu ? "text-rose-500" : ""}`}>
          <Coracao cheio={estado.jaCurtiu} />
          {estado.curtidas !== null ? estado.curtidas.toLocaleString("pt-BR") : "Curtir"}
        </button>
        <button onClick={() => setComentarios(true)} aria-label="Comentários" className={acao}>
          <Balao />
          {estado.comentarios !== null ? estado.comentarios.toLocaleString("pt-BR") : "Comentar"}
        </button>
        <button onClick={compartilhar} aria-label="Compartilhar" className={acao}>
          <Enviar />
          Enviar
        </button>
      </div>

      <div className="absolute bottom-10 left-4 right-20 z-20 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">
          {serie.titulo} · Ep. {ep.numero}
        </p>
        <h2 className="mt-1 text-xl font-bold leading-tight">{ep.titulo}</h2>
        <button onClick={() => setLegendaAberta((v) => !v)} className="pointer-events-auto mt-1 text-left text-sm text-white/90">
          <span className={legendaAberta ? "" : "line-clamp-2"}>{ep.resumo}</span>
        </button>
      </div>

      {aviso && (
        <p className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white" role="status">
          {aviso}
        </p>
      )}

      {comentarios && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={() => setComentarios(false)}>
          <div
            className="max-h-[78%] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 text-fg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Comentários"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {estado.comentarios !== null ? `${estado.comentarios.toLocaleString("pt-BR")} comentários` : "Comentários"}
              </h3>
              <button onClick={() => setComentarios(false)} aria-label="Fechar comentários" className="flex h-9 w-9 items-center justify-center rounded-full bg-page text-slate-600">
                ✕
              </button>
            </div>
            {estado.lista.length > 0 ? (
              <ul className="mb-5 space-y-3">
                {estado.lista.map((c) => (
                  <li key={c.id} className="rounded-xl bg-page px-4 py-3 text-sm">
                    <p className="font-semibold text-fg">{c.nome}</p>
                    <p className="mt-0.5 whitespace-pre-line break-words text-muted">{c.texto}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-muted">Ainda não há comentários. Seja a primeira pessoa.</p>
            )}
            <form onSubmit={enviarComentario} className="space-y-3">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="field" placeholder="Seu nome" maxLength={60} required />
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="field min-h-20" placeholder="Escreva um comentário" maxLength={500} required />
              {/* campo-isca contra robôs */}
              <input value={isca} onChange={(e) => setIsca(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={enviando} className="btn-dark px-5! py-2.5!">
                  {enviando ? "Enviando…" : "Enviar comentário"}
                </button>
                {msg && (
                  <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
                    {msg.texto}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">Os comentários são analisados antes de aparecer.</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Slide({ serie, ep, ativo }: { serie: Serie; ep: Episodio; ativo: boolean }) {
  const agora = useAgora();
  const temVideo = estaDisponivel(ep, agora, process.env.NODE_ENV === "production");
  const dia = diaDaEstreia(ep);

  return (
    <section
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
      aria-label={temVideo ? `Episódio ${ep.numero}: ${ep.titulo}` : `Episódio ${ep.numero}, em breve`}
    >
      <div className={QUADRO} style={ALTURA_QUADRO}>
        <Image src={ep.poster} alt="" fill sizes="100vw" className={`object-cover ${temVideo ? "" : "scale-110 blur-lg"}`} />
        {!temVideo && <div className="absolute inset-0 bg-black/30" />}
      </div>

      {ativo && temVideo && ep.youtubeId && (
        <PlayerYoutube key={ep.youtubeId} videoId={ep.youtubeId} titulo={ep.titulo} reels />
      )}

      {!temVideo && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/75 px-5 py-2 text-sm font-semibold text-white">
          Em breve{dia ? ` · estreia em ${dia}` : ""}
        </span>
      )}

      {ativo && temVideo && <Painel serie={serie} ep={ep} />}

      {!temVideo && (
        <div className="absolute bottom-10 left-4 right-4 z-20 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">
            {serie.titulo} · Ep. {ep.numero}
          </p>
          <h2 className="mt-1 text-xl font-bold">Episódio {ep.numero}</h2>
        </div>
      )}
    </section>
  );
}

/** Visualização em tela cheia, no estilo Reels: um episódio por tela, deslize para cima ou para baixo para trocar. */
export default function ReelsEpisodios({
  serie,
  episodios,
  inicial,
  onFechar,
}: {
  serie: Serie;
  episodios: Episodio[];
  inicial: number;
  onFechar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(inicial);
  const fechar = useRef(onFechar);

  useEffect(() => {
    fechar.current = onFechar;
  }, [onFechar]);

  // Abre já no episódio escolhido.
  useEffect(() => {
    const el = raiz.current;
    if (el) el.scrollTo({ top: inicial * el.clientHeight });
  }, [inicial]);

  // A página de trás não rola; Esc fecha; o botão "voltar" do celular fecha o Reels (e não sai do site).
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    history.pushState({ reels: true }, "");
    const voltou = () => fechar.current();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") history.back();
      const el = raiz.current;
      if (!el) return;
      if (e.key === "ArrowDown") el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      if (e.key === "ArrowUp") el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("popstate", voltou);
    document.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("popstate", voltou);
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, []);

  // Só troca o episódio ativo quando o deslize assenta.
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function aoRolar() {
    clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      const el = raiz.current;
      if (el) setAtivo(Math.round(el.scrollTop / el.clientHeight));
    }, 120);
  }
  useEffect(() => () => clearTimeout(espera.current), []);

  // O botão X desfaz a entrada no histórico (isso dispara "voltou" e fecha).
  const sair = () => history.back();

  return (
    <div className="fixed inset-0 z-[60] bg-black" role="dialog" aria-modal="true" aria-label={`${serie.titulo}: episódios`}>
      <div ref={raiz} onScroll={aoRolar} className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {episodios.map((ep, i) => (
          <Slide key={ep.numero} serie={serie} ep={ep} ativo={i === ativo} />
        ))}
      </div>
      <button
        onClick={sair}
        aria-label="Fechar"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur-sm"
      >
        ✕
      </button>
    </div>
  );
}
