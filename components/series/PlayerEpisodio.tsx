"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { diaDaEstreia, estaDisponivel, idEpisodio, type Episodio, type Serie } from "@/lib/series";
import { useAgora } from "./useAgora";

type Comentario = { id: string; nome: string; texto: string; created_at: string };
type Estado = {
  curtidas: number | null;
  comentarios: number | null;
  jaCurtiu: boolean;
  lista: Comentario[];
};

/** Identifica o navegador (sem login) para limitar a uma curtida por pessoa. */
function idDoNavegador() {
  try {
    let id = localStorage.getItem("serie-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("serie-id", id);
    }
    return id;
  } catch {
    return "";
  }
}

function Coracao({ cheio }: { cheio: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill={cheio ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.6 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.4 3.2 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
    </svg>
  );
}

function Balao() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}

export default function PlayerEpisodio({
  serie,
  episodio,
  onFechar,
}: {
  serie: Serie;
  episodio: Episodio;
  onFechar: () => void;
}) {
  const id = idEpisodio(serie.slug, episodio.numero);
  const [tocando, setTocando] = useState(false);
  const [estado, setEstado] = useState<Estado>({ curtidas: null, comentarios: null, jaCurtiu: false, lista: [] });
  const [verComentarios, setVerComentarios] = useState(false);
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [isca, setIsca] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = useRef(onFechar);
  const agora = useAgora();

  useEffect(() => {
    fechar.current = onFechar;
  }, [onFechar]);

  // Esc fecha e a página de trás não rola enquanto o player está aberto
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, []);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/serie/estado?episodio=${encodeURIComponent(id)}&sessao=${idDoNavegador()}`);
      if (r.ok) setEstado(await r.json());
    } catch {
      // sem rede: o player funciona do mesmo jeito
    }
  }, [id]);

  useEffect(() => {
    // busca inicial do estado (curtidas e comentários) ao abrir o episódio
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function curtir() {
    const antes = estado;
    setEstado({ ...estado, jaCurtiu: !estado.jaCurtiu });
    try {
      const r = await fetch("/api/serie/curtir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodio: id, sessao: idDoNavegador() }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEstado((e) => ({ ...e, jaCurtiu: d.curtiu, curtidas: d.curtidas }));
    } catch {
      setEstado(antes);
    }
  }

  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/serie/comentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodio: id, nome, texto, site: isca }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível enviar.");
      setNome("");
      setTexto("");
      setMsg({ ok: true, texto: "Obrigado! Seu comentário aparece aqui depois de aprovado." });
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : "Não foi possível enviar." });
    } finally {
      setEnviando(false);
    }
  }

  const emProducao = process.env.NODE_ENV === "production";
  const arquivo = !emProducao ? episodio.arquivoLocal : undefined;
  const temVideo = estaDisponivel(episodio, agora, emProducao);
  const dia = diaDaEstreia(episodio);
  const botao =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Episódio ${episodio.numero}: ${episodio.titulo}`}
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row">
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          ✕
        </button>

        {/* vídeo (vertical) */}
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] shrink-0 self-center bg-black max-md:max-h-[52vh] max-md:w-auto md:max-w-[340px]">
          {tocando && episodio.youtubeId ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${episodio.youtubeId}?autoplay=1&rel=0&playsinline=1`}
              title={episodio.titulo}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : tocando && arquivo ? (
            <video className="absolute inset-0 h-full w-full" src={arquivo} controls autoPlay playsInline />
          ) : (
            <>
              <Image src={episodio.poster} alt="" fill sizes="340px" className="object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              {temVideo ? (
                <button
                  onClick={() => setTocando(true)}
                  data-track={`serie:${serie.slug}:${episodio.numero}:play`}
                  aria-label="Assistir ao episódio"
                  className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-strong text-white shadow-xl shadow-accent/50 transition hover:scale-105"
                >
                  <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9" fill="currentColor" aria-hidden>
                    <path d="M6 4l14 8-14 8z" />
                  </svg>
                </button>
              ) : (
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/75 px-5 py-2 text-sm font-semibold text-white">
                  Em breve{dia ? ` · estreia em ${dia}` : ""}
                </span>
              )}
            </>
          )}
        </div>

        {/* informações, curtir e comentar */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-7">
          <p className="eyebrow mb-1">
            {serie.titulo} · Episódio {episodio.numero}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-fg">{episodio.titulo}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{episodio.resumo}</p>
          <p className="mt-2 text-xs text-slate-500">Duração: {episodio.duracao} · História fictícia, problema real.</p>

          {!temVideo && (
            <p className="mt-5 rounded-xl bg-page px-4 py-3 text-sm text-muted">
              Este episódio ainda não estreou{dia ? `: ele sai em ${dia}` : ""}. Volte aqui para assistir,
              curtir e comentar.
            </p>
          )}

          <div className={`mt-5 flex flex-wrap items-center gap-3 ${temVideo ? "" : "hidden"}`}>
            <button
              onClick={curtir}
              aria-pressed={estado.jaCurtiu}
              data-track={`serie:${serie.slug}:${episodio.numero}:curtir`}
              className={`${botao} ${
                estado.jaCurtiu
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : "border-line bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              <Coracao cheio={estado.jaCurtiu} />
              {estado.curtidas !== null ? estado.curtidas.toLocaleString("pt-BR") : "Curtir"}
            </button>
            <button
              onClick={() => setVerComentarios((v) => !v)}
              aria-expanded={verComentarios}
              className={`${botao} border-line bg-white text-slate-700 hover:border-slate-400`}
            >
              <Balao />
              {estado.comentarios !== null
                ? `${estado.comentarios.toLocaleString("pt-BR")} comentários`
                : "Comentar"}
            </button>
          </div>

          {temVideo && verComentarios && (
            <div className="mt-5 border-t border-line pt-5">
              {estado.lista.length > 0 && (
                <ul className="mb-5 space-y-3">
                  {estado.lista.map((c) => (
                    <li key={c.id} className="rounded-xl bg-page px-4 py-3 text-sm">
                      <p className="font-semibold text-fg">{c.nome}</p>
                      <p className="mt-0.5 whitespace-pre-line break-words text-muted">{c.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={comentar} className="space-y-3">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="field"
                  placeholder="Seu nome"
                  maxLength={60}
                  required
                />
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="field min-h-24"
                  placeholder="Escreva um comentário"
                  maxLength={500}
                  required
                />
                {/* campo-isca contra robôs */}
                <input
                  value={isca}
                  onChange={(e) => setIsca(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <div className="flex items-center gap-3">
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
          )}
        </div>
      </div>
    </div>
  );
}
