"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import Link from "next/link";
import { abrirChat as abrirChatGlobal } from "@/lib/chat";

function RotuloLink({ label, play }: { label: string; play?: boolean }) {
  if (!play) return <>{label}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-accent-light"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 3.5v17a1 1 0 001.5.9l14-8.5a1 1 0 000-1.8l-14-8.5A1 1 0 006 3.5z" />
      </svg>
    </span>
  );
}

const links: { href: string; label: string; play?: boolean }[] = [
  { href: "/#vida-de-dono", label: "Vida de Dono", play: true },
  { href: "/#sobre", label: "Sobre" },
  { href: "/#como-contratar", label: "Como contratar" },
  { href: "/#projetos", label: "Projetos" },
  { href: "/#formacao", label: "Formação" },
  { href: "/#contato", label: "Contato" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  /** Na home, rola até a seção mesmo que o endereço já tenha essa âncora (o Next não rola nesse caso). */
  const irParaSecao = (e: React.MouseEvent, href: string) => {
    close();
    if (window.location.pathname !== "/") return;
    const alvo = document.getElementById(href.replace("/#", ""));
    if (!alvo) return;
    e.preventDefault();
    alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href.slice(1));
  };
  const abrirChat = () => {
    setMenuOpen(false);
    abrirChatGlobal();
  };

  return (
    <nav
      ref={navRef}
      className={`fixed left-0 top-0 z-50 w-full border-b-2 border-accent bg-brand transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-slate-900/40" : "shadow-md shadow-slate-900/10"
      }`}
    >
      <div
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6"
      >
        <Link href="/" onClick={close} aria-label="Igor Arthur, início">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 text-sm sm:flex">
          {links.map((l) =>
            l.href === "/#contato" ? (
              <button
                key={l.href}
                onClick={abrirChat}
                data-track="menu-contato"
                className="rounded-lg px-3 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </button>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => irParaSecao(e, l.href)}
                className="rounded-lg px-3 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <RotuloLink label={l.label} play={l.play} />
              </Link>
            ),
          )}
          <a
            href="/api/curriculo"
            className="ml-2 rounded-lg bg-accent-strong px-4 py-2 font-semibold text-white transition hover:bg-accent"
          >
            Currículo
          </a>
        </div>

        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/10 sm:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          <span
            className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "rotate-45" : "-translate-y-1.5"
            }`}
          />
          <span
            className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
              menuOpen ? "-rotate-45" : "translate-y-1.5"
            }`}
          />
        </button>
      </div>

      <div
        className={`grid overflow-hidden transition-all duration-300 sm:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 px-5 pb-5 pt-1 text-base">
            {links.map((l) =>
              l.href === "/#contato" ? (
                <button
                  key={l.href}
                  onClick={abrirChat}
                  data-track="menu-contato"
                  className="rounded-lg px-3 py-3 text-left text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </button>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={(e) => irParaSecao(e, l.href)}
                  className="rounded-lg px-3 py-3 text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <RotuloLink label={l.label} play={l.play} />
                </Link>
              ),
            )}
            <a
              href="/api/curriculo"
              onClick={close}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-accent-strong px-4 py-3 font-semibold text-white"
            >
              Baixar currículo
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
