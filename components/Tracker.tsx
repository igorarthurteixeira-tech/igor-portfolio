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
    if (pathname.startsWith("/admin")) return;
    enviar({
      tipo: "view",
      caminho: pathname,
      referrer: document.referrer || null,
    });
  }, [pathname]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest<HTMLElement>("a, button");
      if (!el || window.location.pathname.startsWith("/admin")) return;
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
