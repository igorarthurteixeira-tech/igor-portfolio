"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { ABRIR_CHAT } from "@/lib/chat";

const CHAVE = "chat-faixa-fechada";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Msg = { de: "igor" | "voce"; texto: string };
type Etapa = "nome" | "email" | "mensagem" | "enviando" | "fim";

const ABERTURA: Msg[] = [
  { de: "igor", texto: "Oi! Eu sou o Igor. Vamos conversar sobre o seu projeto?" },
  { de: "igor", texto: "Para começar, qual é o seu nome?" },
];

export default function ChatBubble() {
  const pathname = usePathname();
  const [faixa, setFaixa] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(ABERTURA);
  const [etapa, setEtapa] = useState<Etapa>("nome");
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const dados = useRef({ nome: "", email: "", mensagem: "" });
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A faixa abre sozinha ao carregar e recolhe depois de alguns segundos.
  useEffect(() => {
    let fechada = false;
    try {
      fechada = sessionStorage.getItem(CHAVE) === "1";
    } catch {
      // sem sessionStorage: abre normalmente
    }
    if (fechada) return;
    const abrir = setTimeout(() => setFaixa(true), 900);
    const recolher = setTimeout(() => setFaixa(false), 11000);
    return () => {
      clearTimeout(abrir);
      clearTimeout(recolher);
    };
  }, []);

  const abrirChat = useCallback(() => {
    setAberto(true);
    setFaixa(false);
    try {
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      // ignora
    }
  }, []);

  // Permite abrir o chat de fora (ex.: link "Contato" do menu).
  useEffect(() => {
    window.addEventListener(ABRIR_CHAT, abrirChat);
    return () => window.removeEventListener(ABRIR_CHAT, abrirChat);
  }, [abrirChat]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, digitando, aberto]);

  // Igor "digita" por um instante antes de responder.
  function responder(textos: string[], depois?: () => void) {
    setDigitando(true);
    let atraso = 0;
    textos.forEach((t, i) => {
      atraso += 650;
      setTimeout(() => {
        setMsgs((m) => [...m, { de: "igor", texto: t }]);
        if (i === textos.length - 1) {
          setDigitando(false);
          depois?.();
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, atraso);
    });
  }

  async function enviar() {
    setEtapa("enviando");
    try {
      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados.current),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || "Erro ao enviar.");
      responder(
        [
          `Mensagem enviada, ${dados.current.nome.split(" ")[0]}! Vou responder no e-mail ${dados.current.email} o quanto antes.`,
        ],
        () => setEtapa("fim"),
      );
    } catch {
      responder(
        [
          "Não consegui enviar agora. Tente de novo em instantes ou me chame direto no WhatsApp.",
        ],
        () => setEtapa("mensagem"),
      );
    }
  }

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const valor = texto.trim();
    if (!valor || digitando || etapa === "enviando" || etapa === "fim") return;
    setTexto("");
    setMsgs((m) => [...m, { de: "voce", texto: valor }]);

    if (etapa === "nome") {
      if (valor.length < 2) {
        responder(["Pode me dizer o seu nome?"]);
        return;
      }
      dados.current.nome = valor.slice(0, 120);
      responder(
        [`Prazer, ${valor.split(" ")[0]}! Qual é o seu e-mail para eu responder?`],
        () => setEtapa("email"),
      );
    } else if (etapa === "email") {
      if (!EMAIL.test(valor)) {
        responder(["Esse e-mail não parece válido. Pode conferir?"]);
        return;
      }
      dados.current.email = valor.slice(0, 200);
      responder(
        ["Perfeito. Agora me conte o que você precisa ou qual problema quer resolver."],
        () => setEtapa("mensagem"),
      );
    } else if (etapa === "mensagem") {
      if (valor.length < 10) {
        responder(["Conte um pouco mais, por favor (pelo menos uma frase)."]);
        return;
      }
      dados.current.mensagem = valor.slice(0, 4000);
      enviar();
    }
  }

  function recomecar() {
    dados.current = { nome: "", email: "", mensagem: "" };
    setMsgs(ABERTURA);
    setEtapa("nome");
  }

  if (pathname.startsWith("/admin")) return null;

  const placeholder =
    etapa === "nome"
      ? "Digite o seu nome"
      : etapa === "email"
        ? "Digite o seu e-mail"
        : etapa === "mensagem"
          ? "Conte o que você precisa"
          : "";
  const bloqueado = etapa === "enviando" || etapa === "fim" || digitando;

  return (
    <div className="relative flex items-center gap-2">
      {/* JANELA DO CHAT */}
      <div
        role="dialog"
        aria-label="Chat com Igor Arthur"
        aria-hidden={!aberto}
        className={`absolute bottom-full right-0 mb-3 flex h-[min(520px,calc(100dvh-9rem))] w-[min(380px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/30 ring-1 ring-line transition-all duration-300 ${
          aberto
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <header className="flex items-center gap-3 bg-brand px-4 py-3 text-white">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/80">
            <Image
              src="/perfil.jpg"
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">Igor Arthur</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Disponível para novos projetos
            </p>
          </div>
          <button
            onClick={() => setAberto(false)}
            aria-label="Fechar chat"
            tabIndex={aberto ? 0 : -1}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div
          className="flex-1 space-y-3 overflow-y-auto bg-page px-4 py-4"
          aria-live="polite"
        >
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.de === "voce" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${
                  m.de === "voce"
                    ? "rounded-br-sm bg-accent-strong text-white"
                    : "rounded-bl-sm bg-white text-fg shadow-sm ring-1 ring-line"
                }`}
              >
                {m.texto}
              </p>
            </div>
          ))}

          {digitando && (
            <div className="flex justify-start" aria-label="Igor está digitando">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-line">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    style={{ animationDelay: `${d}ms` }}
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  />
                ))}
              </div>
            </div>
          )}

          {etapa === "fim" && !digitando && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={recomecar}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-fg transition hover:border-accent-strong hover:text-accent-strong"
              >
                Enviar outra mensagem
              </button>
            </div>
          )}

          <div ref={fimRef} />
        </div>

        <div className="border-t border-line bg-white">
          <form onSubmit={aoEnviar} className="flex items-center gap-2 px-3 py-3">
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={bloqueado}
              type="text"
              inputMode={etapa === "email" ? "email" : "text"}
              maxLength={etapa === "mensagem" ? 4000 : 200}
              placeholder={placeholder}
              aria-label={placeholder || "Mensagem"}
              tabIndex={aberto ? 0 : -1}
              autoComplete={
                etapa === "nome" ? "name" : etapa === "email" ? "email" : "off"
              }
              className="min-w-0 flex-1 rounded-full border border-line bg-page px-4 py-2.5 text-sm text-fg outline-none transition placeholder:text-slate-400 focus:border-accent-strong disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={bloqueado || !texto.trim()}
              aria-label="Enviar"
              tabIndex={aberto ? 0 : -1}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white transition hover:bg-accent disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />
              </svg>
            </button>
          </form>
          <div className="flex items-center justify-center gap-3 border-t border-line px-3 py-2 text-xs text-slate-500">
            <span>Prefere outro canal?</span>
            <a
              href={site.contato.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={aberto ? 0 : -1}
              className="font-semibold text-accent-strong hover:underline"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${site.contato.email}`}
              tabIndex={aberto ? 0 : -1}
              className="font-semibold text-accent-strong hover:underline"
            >
              E-mail
            </a>
          </div>
        </div>
      </div>

      {/* FAIXA QUE ABRE AO CARREGAR */}
      <div
        className={`absolute right-[calc(100%+0.5rem)] top-1/2 flex w-[min(300px,calc(100vw-6.5rem))] -translate-y-1/2 items-center overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/20 ring-1 ring-line transition-all duration-500 ease-out ${
          faixa && !aberto
            ? "opacity-100 [clip-path:inset(-24px)]"
            : "pointer-events-none opacity-0 [clip-path:inset(-24px_-24px_-24px_100%)]"
        }`}
        aria-hidden={!faixa || aberto}
      >
        <button
          onClick={abrirChat}
          data-track="balao-chat"
          tabIndex={faixa && !aberto ? 0 : -1}
          className="py-3 pl-4 pr-2 text-left text-sm font-semibold leading-snug text-fg"
        >
          Vamos conversar sobre o seu projeto?
        </button>
        <button
          onClick={() => {
            setFaixa(false);
            try {
              sessionStorage.setItem(CHAVE, "1");
            } catch {
              // ignora
            }
          }}
          tabIndex={faixa && !aberto ? 0 : -1}
          aria-label="Fechar mensagem"
          className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-fg"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* BALÃO */}
      <button
        onClick={() => (aberto ? setAberto(false) : abrirChat())}
        onMouseEnter={() => !aberto && setFaixa(true)}
        data-track="balao-chat"
        aria-label={aberto ? "Fechar chat" : "Abrir chat: vamos conversar sobre o seu projeto?"}
        aria-expanded={aberto}
        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-xl shadow-slate-900/30 transition hover:scale-105 hover:bg-accent"
      >
        {!aberto && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          </span>
        )}
        {aberto ? (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
          </svg>
        )}
      </button>
    </div>
  );
}
