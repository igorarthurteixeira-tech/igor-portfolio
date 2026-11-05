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

// áreas de trabalho (painel e pedidos da ETM): nunca entram nas estatísticas do portfólio
const AREAS_PRIVADAS = ["/admin", "/etm"];
const privada = (caminho: string) => AREAS_PRIVADAS.some((a) => caminho === a || caminho.startsWith(`${a}/`));

/**
 * Não conta o dono do site nem testes: aparelhos que já abriram o painel, qualquer pessoa com login
 * (o dono em janela anônima também, assim que entra) e endereços fora do site oficial.
 */
function ignorar() {
  try {
    if (!SITES.includes(window.location.hostname)) return true;
    if (/sb-[^=;]*-auth-token/.test(document.cookie)) return true;
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

/**
 * Sinais de que a visita é de uma pessoa de verdade e não de um robô ou de uma prévia de link.
 * Nenhum deles identifica quem é: são o tamanho da tela, o idioma, o fuso e se o navegador é automatizado.
 */
function sinais() {
  const nav = navigator as Navigator & { webdriver?: boolean };
  let fuso: string | null = null;
  try {
    fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // sem fuso
  }
  return {
    v: 2,
    webdriver: nav.webdriver === true,
    tela: `${screen.width}x${screen.height}`,
    idioma: nav.language ?? null,
    fuso,
  };
}

function enviar(dados: Record<string, unknown>) {
  const corpo = JSON.stringify({ ...dados, ...sinais(), sessao: sessao() });
  try {
    const blob = new Blob([corpo], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/eventos", blob)) {
      fetch("/api/eventos", { method: "POST", body: corpo, keepalive: true });
    }
  } catch {
    // métrica nunca deve quebrar o site
  }
}

// o que uma pessoa faz e um robô, em geral, não
const GESTOS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "wheel"] as const;

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
    if (privada(pathname) || ignorar() || jaContou(pathname)) return;

    // A visita é registrada quando a pessoa faz o primeiro gesto (mouse, rolagem, toque ou tecla) ou, no mais tardar,
    // depois de 5 s ou ao sair da página. Fica anotado se houve gesto e quanto tempo se passou: sem gesto e saída
    // imediata é o padrão de robô e de prévia de link.
    const inicio = performance.now();
    const referrer = document.referrer || null;
    let interagiu = false;
    let enviado = false;

    const registrar = () => {
      if (enviado) return;
      enviado = true;
      limpar();
      enviar({ tipo: "view", caminho: pathname, referrer, interagiu, tempo_ms: Math.round(performance.now() - inicio) });
    };
    const aoGesto = () => {
      interagiu = true;
      registrar();
    };
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") registrar();
    };
    const limpar = () => {
      GESTOS.forEach((g) => window.removeEventListener(g, aoGesto));
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", registrar);
      clearTimeout(espera);
    };

    GESTOS.forEach((g) => window.addEventListener(g, aoGesto, { passive: true }));
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", registrar);
    const espera = setTimeout(registrar, 5000);

    // trocou de página antes de registrar: registra agora, com o que se sabe
    return registrar;
  }, [pathname]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest<HTMLElement>("a, button");
      if (!el || privada(window.location.pathname) || ignorar()) return;
      const alvo =
        el.dataset.track ||
        (el instanceof HTMLAnchorElement ? el.getAttribute("href") : null);
      if (!alvo || alvo.startsWith("#")) return;
      enviar({ tipo: "click", caminho: window.location.pathname, alvo, interagiu: true });
    }
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  return null;
}
