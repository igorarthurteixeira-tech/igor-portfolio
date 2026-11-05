"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// rascunho esquecido por mais de 7 dias não volta
const VALIDADE = 7 * 24 * 60 * 60 * 1000;

/**
 * Guarda o que a pessoa está preenchendo no próprio navegador (localStorage) e devolve ao recarregar a página.
 * Salva sozinho, meio segundo depois da última digitação. Arquivos não entram: o navegador não os guarda aqui.
 * Use uma `chave` que inclua quem está logado, para um computador compartilhado não mostrar o rascunho de outra pessoa.
 */
export function useRascunho<T extends Record<string, string | boolean>>(chave: string, inicial: T) {
  const base = useRef(inicial);
  const pronto = useRef(false);
  const [valores, setValores] = useState<T>(inicial);
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chave);
      if (bruto) {
        const salvo = JSON.parse(bruto) as { v?: Partial<T>; t?: number };
        if (salvo.v && salvo.t && Date.now() - salvo.t < VALIDADE) {
          setValores({ ...base.current, ...salvo.v });
          setRestaurado(true);
        } else {
          localStorage.removeItem(chave);
        }
      }
    } catch {
      // sem acesso ao armazenamento (janela privada, bloqueio): o formulário só não guarda rascunho
    }
    pronto.current = true;
  }, [chave]);

  useEffect(() => {
    if (!pronto.current) return;
    const espera = setTimeout(() => {
      try {
        // formulário igual ao de partida não precisa de rascunho
        if (JSON.stringify(valores) === JSON.stringify(base.current)) localStorage.removeItem(chave);
        else localStorage.setItem(chave, JSON.stringify({ v: valores, t: Date.now() }));
      } catch {
        // cota cheia ou armazenamento indisponível
      }
    }, 500);
    return () => clearTimeout(espera);
  }, [chave, valores]);

  const atualizar = useCallback((parcial: Partial<T>) => setValores((v) => ({ ...v, ...parcial })), []);

  /** Apaga o rascunho e volta o formulário ao início (depois de enviar, ou ao descartar). */
  const limpar = useCallback(() => {
    try {
      localStorage.removeItem(chave);
    } catch {
      // sem armazenamento
    }
    setValores(base.current);
    setRestaurado(false);
  }, [chave]);

  return { valores, atualizar, restaurado, limpar };
}
