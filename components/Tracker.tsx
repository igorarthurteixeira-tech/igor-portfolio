"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function sessao() {
  try {
    let id = sessionStorage.getItem("sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

const SITES = ["igorarthurdev.com.br", "www.igorarthurdev.com.br"];

/** Não conta o dono do site (aparelhos que já abriram o painel) nem testes fora do endereço oficial. */
function ignorar() {
  try {
    if (!SITES.includes(window.location.hostname)) return true;
    return localStorage.getItem("sem-metrica") === "1";
  } catch {
    return false;
  }
}

/** Cada página conta uma vez por sessão: recarregar ou voltar não infla. */
function jaContou(caminho: string) {
  try {
    const chave = `v:${caminho}`;
    if (sessionStorage.getItem(chave)) return true;
    sessionStorage.setItem(chave, "1");
  } catch {
    // sem sessionStorage: conta normalmente
  }
  return false;
}

function enviar(dados: Record<string, unknown>) {
  const corpo = JSON.stringify({ ...dados, sessao: sessao() });
  try {
    const blob = new Blob([corpo], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/eventos", blob)) {
      fetch("/api/eventos", { method: "POST", body: corpo, keepalive: true });
    }
  } catch {
    // métrica nunca deve quebrar o site
  }
}

export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      try {
        localStorage.setItem("sem-metrica", "1");
      } catch {
        // ignorar
      }
      return;
    }
    if (ignorar() || jaContou(pathname)) return;
    enviar({
      tipo: "view",
      caminho: pathname,
      referrer: document.referrer || null,
    });
  }, [pathname]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest<HTMLElement>("a, button");
      if (!el || window.location.pathname.startsWith("/admin") || ignorar()) return;
      const alvo =
        el.dataset.track ||
        (el instanceof HTMLAnchorElement ? el.getAttribute("href") : null);
      if (!alvo || alvo.startsWith("#")) return;
      enviar({ tipo: "click", caminho: window.location.pathname, alvo });
    }
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  return null;
}
