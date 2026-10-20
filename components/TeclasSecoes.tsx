"use client";

import { useEffect } from "react";

const ALTURA_MENU = 66; // menu fixo no topo (64px + filete)
const TOLERANCIA = 8;
const FOLGA_PARADA = 96; // espaço entre o menu e o início do bloco da parada interna

/**
 * Setas ↑ e ↓ levam de uma seção da página para a outra.
 * Considera como paradas os filhos <section> diretos de <main>, o rodapé e
 * qualquer elemento marcado com data-parada dentro de uma seção.
 * Não interfere em campos de texto, no chat nem na galeria, e mantém a conta
 * certa se a tecla for apertada várias vezes durante a rolagem suave.
 */
export default function TeclasSecoes() {
  useEffect(() => {
    let alvo: number | null = null; // índice do destino em andamento
    let limpar: ReturnType<typeof setTimeout> | undefined;

    /** Topo de cada parada: o começo de cada seção e as paradas internas (data-parada). */
    function secoes() {
      const topos: number[] = [];
      document
        .querySelectorAll<HTMLElement>("main > section, footer")
        .forEach((el, i) => {
          const topo = el.getBoundingClientRect().top + window.scrollY;
          // a primeira seção (hero) começa no topo da página
          topos.push(i === 0 ? 0 : Math.max(0, topo - ALTURA_MENU));
          el.querySelectorAll<HTMLElement>("[data-parada]").forEach((p) => {
            const t = p.getBoundingClientRect().top + window.scrollY;
            topos.push(Math.max(0, t - ALTURA_MENU - FOLGA_PARADA));
          });
        });
      return topos;
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const el = e.target as HTMLElement | null;
      if (
        el?.closest(
          'input, textarea, select, video, [contenteditable="true"], [role="listbox"], [role="slider"], [role="menu"]',
        )
      )
        return;
      // galeria aberta ou chat aberto: as setas são deles
      if (
        document.querySelector(
          '[role="dialog"][aria-modal="true"], [role="dialog"][aria-hidden="false"]',
        )
      )
        return;

      const tops = secoes();
      if (tops.length < 2) return;

      const y = window.scrollY;
      const maximo = document.documentElement.scrollHeight - window.innerHeight;
      let atual: number;
      if (alvo !== null) {
        atual = alvo; // rolagem em andamento: continua a partir do destino
      } else {
        // última seção cujo topo já ficou para trás (ou no lugar)
        atual = 0;
        tops.forEach((t, i) => {
          if (t <= y + TOLERANCIA) atual = i;
        });
      }

      let destino: number;
      if (e.key === "ArrowDown") {
        destino = atual + 1;
        // no fim da página não há para onde ir
        if (destino >= tops.length) {
          if (alvo === null && y >= maximo - TOLERANCIA) return;
          destino = tops.length - 1;
        }
      } else {
        // ↑ no meio de uma seção volta ao começo dela antes de subir para a anterior
        const noTopo = Math.abs(y - tops[atual]) <= TOLERANCIA;
        destino = alvo === null && !noTopo ? atual : atual - 1;
        if (destino < 0) {
          if (y <= TOLERANCIA && alvo === null) return;
          destino = 0;
        }
      }

      e.preventDefault();
      alvo = destino;
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: Math.min(tops[destino], maximo),
        behavior: reduzir ? "auto" : "smooth",
      });
      clearTimeout(limpar);
      limpar = setTimeout(() => {
        alvo = null;
      }, 900);
    }

    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      clearTimeout(limpar);
    };
  }, []);

  return null;
}
