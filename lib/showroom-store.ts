"use client";

import { useSyncExternalStore } from "react";
import { carrosDemo, type Carro } from "./carros";

/**
 * "Banco de dados" do showroom de demonstração: vive só no navegador de quem
 * está usando (localStorage). Nada é enviado para servidor nenhum.
 */
export type Interessado = {
  id: string;
  carroId: string;
  nome: string;
  telefone: string;
  mensagem: string;
  em: string;
};

type Estado = {
  extras: Carro[];
  edits: Record<string, Partial<Carro>>;
  removidos: string[];
  interessados: Interessado[];
};

const CHAVE = "showroom-demo-v1";
const VAZIO: Estado = { extras: [], edits: {}, removidos: [], interessados: [] };

let cacheBruto: string | null = null;
let cacheEstado: Estado = VAZIO;
const ouvintes = new Set<() => void>();

function ler(): Estado {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    return VAZIO;
  }
  if (bruto === cacheBruto) return cacheEstado;
  cacheBruto = bruto;
  try {
    cacheEstado = bruto ? { ...VAZIO, ...JSON.parse(bruto) } : VAZIO;
  } catch {
    cacheEstado = VAZIO;
  }
  return cacheEstado;
}

function gravar(prox: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prox));
  } catch {
    // cota cheia ou bloqueado: a alteração fica só nesta sessão
    cacheBruto = null;
    cacheEstado = prox;
  }
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  const aoMudarOutraAba = (e: StorageEvent) => e.key === CHAVE && f();
  window.addEventListener("storage", aoMudarOutraAba);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudarOutraAba);
  };
}

export function juntar(e: Estado): Carro[] {
  const base = carrosDemo
    .filter((c) => !e.removidos.includes(c.id))
    .map((c) => ({ ...c, ...(e.edits[c.id] ?? {}) }));
  const extras = e.extras
    .filter((c) => !e.removidos.includes(c.id))
    .map((c) => ({ ...c, ...(e.edits[c.id] ?? {}) }));
  return [...extras, ...base];
}

function useEstado() {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

export function useCarros(): Carro[] {
  return juntar(useEstado());
}

export function useCarro(id: string): Carro | undefined {
  return juntar(useEstado()).find((c) => c.id === id);
}

export function useInteressados(): Interessado[] {
  return useEstado().interessados;
}

export function salvarCarro(carro: Carro) {
  const e = ler();
  const ehDemo = carrosDemo.some((c) => c.id === carro.id);
  const ehExtra = e.extras.some((c) => c.id === carro.id);
  if (ehDemo) gravar({ ...e, edits: { ...e.edits, [carro.id]: carro } });
  else if (ehExtra) gravar({ ...e, extras: e.extras.map((c) => (c.id === carro.id ? carro : c)) });
  else gravar({ ...e, extras: [carro, ...e.extras] });
}

export function marcarVendido(id: string, vendido: boolean) {
  const e = ler();
  gravar({ ...e, edits: { ...e.edits, [id]: { ...(e.edits[id] ?? {}), vendido } } });
}

export function removerCarro(id: string) {
  const e = ler();
  gravar({ ...e, removidos: [...e.removidos, id], extras: e.extras.filter((c) => c.id !== id) });
}

export function registrarInteresse(i: Omit<Interessado, "id" | "em">) {
  const e = ler();
  const novo: Interessado = { ...i, id: crypto.randomUUID(), em: new Date().toISOString() };
  gravar({ ...e, interessados: [novo, ...e.interessados] });
}

export function apagarInteresse(id: string) {
  const e = ler();
  gravar({ ...e, interessados: e.interessados.filter((x) => x.id !== id) });
}

export function restaurarDemo() {
  gravar(VAZIO);
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const kmTxt = (n: number) => (n === 0 ? "0 km" : `${n.toLocaleString("pt-BR")} km`);
