"use client";

import { useState } from "react";
import type { RespostaBusca, ResultadoBusca } from "@/lib/escritorio/busca";
import { dinheiro } from "@/lib/escritorio/eventos";
import { Painel } from "./Paineis";

const EXEMPLOS = ["televisor 65 polegadas", "geladeira 400 litros", "airfryer", "ar condicionado 12000 btus", "notebook", "ventilador de coluna"];

/**
 * Busca de produtos nas lojas reais. O pesquisador faz a busca de verdade (a cena mostra ele indo às lojas)
 * e a lista traz o que existe à venda agora, com o mesmo modelo de lojas diferentes numa linha só.
 */
export function BuscaProdutos({
  aoBuscar,
  aoEscolher,
  escolhidoChave,
}: {
  aoBuscar: (termo: string) => Promise<RespostaBusca | string>;
  aoEscolher: (r: ResultadoBusca) => Promise<string | null>;
  escolhidoChave: string | null;
}) {
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resposta, setResposta] = useState<RespostaBusca | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [falha, setFalha] = useState("");

  async function buscar(t: string) {
    const limpo = t.trim();
    if (limpo.length < 3 || buscando) return;
    setTermo(limpo);
    setBuscando(true);
    setResposta(null);
    setFalha("");
    const r = await aoBuscar(limpo);
    setBuscando(false);
    if (typeof r === "string") setFalha(r);
    else setResposta(r);
  }

  const exatos = resposta?.resultados.filter((r) => r.exato) ?? [];
  const proximos = resposta?.resultados.filter((r) => !r.exato) ?? [];

  const linha = (r: ResultadoBusca) => {
    const escolhido = escolhidoChave === r.chave;
    const lojas = [...new Set(r.ofertas.map((o) => o.loja))];
    return (
      <li key={r.chave} className={`flex gap-2.5 rounded-lg p-2 transition ${escolhido ? "bg-amber-300/15 ring-1 ring-amber-300/60" : "bg-white/5"}`}>
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
          {r.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.imagem} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[9px] text-slate-400">sem foto</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-snug text-white">{r.nome}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {r.marca && <span>{r.marca} · </span>}
            {r.medida && <span className={r.exato ? "" : "text-amber-200"}>{r.medida} · </span>}
            {lojas.length > 1 ? <span className="text-emerald-300">em {lojas.length} lojas</span> : <span>{lojas[0]}</span>}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-300">
            {r.ofertas
              .slice(0, 3)
              .map((o) => `${o.loja} ${dinheiro(o.preco)}`)
              .join(" · ")}
            {r.ofertas.length > 3 ? ` · +${r.ofertas.length - 3}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-1">
          <span className="text-sm font-bold tabular-nums text-white">{dinheiro(r.menor)}</span>
          <button
            type="button"
            disabled={!!escolhendo || escolhido}
            onClick={async () => {
              setEscolhendo(r.chave);
              setFalha("");
              const erro = await aoEscolher(r);
              setEscolhendo(null);
              if (erro) setFalha(erro);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-default ${
              escolhido ? "bg-amber-300 text-amber-950" : "bg-accent text-white hover:bg-accent-light disabled:opacity-50"
            }`}
          >
            {escolhido ? "Escolhido ✓" : escolhendo === r.chave ? "Conferindo..." : "Escolher"}
          </button>
        </div>
      </li>
    );
  };

  return (
    <Painel titulo="O que você quer acompanhar?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(termo);
        }}
        className="flex gap-2"
      >
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex.: televisor 65 polegadas"
          maxLength={80}
          aria-label="Produto que você procura"
          className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-light"
        />
        <button type="submit" disabled={buscando || termo.trim().length < 3} className="btn-primary px-4! py-2!">
          {buscando ? "Pesquisando..." : "Pesquisar"}
        </button>
      </form>

      {!resposta && !buscando && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXEMPLOS.map((x) => (
            <button key={x} type="button" onClick={() => void buscar(x)} className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] text-slate-200 hover:bg-white/15">
              {x}
            </button>
          ))}
        </div>
      )}

      {falha && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {falha}
        </p>
      )}

      {buscando && (
        <p className="mt-3 animate-pulse text-sm text-slate-300">O pesquisador está consultando as lojas (KaBuM, Americanas e lojas VTEX)...</p>
      )}

      {resposta && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-slate-400">
            {resposta.resultados.length
              ? `${resposta.resultados.length} produto${resposta.resultados.length > 1 ? "s" : ""} à venda agora, em ${resposta.lojas} lojas consultadas`
              : `Nada encontrado em ${resposta.lojas} lojas. Tente outras palavras (ex.: "smart tv 50", "geladeira 400 litros").`}
            {resposta.falhas.length > 0 && <span className="text-amber-200"> · não responderam: {resposta.falhas.join(", ")}</span>}
          </p>
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {exatos.map(linha)}
            {proximos.length > 0 && (
              <li className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
                Medida próxima da pedida
              </li>
            )}
            {proximos.map(linha)}
          </ul>
          <p className="mt-2 text-[10px] text-slate-500">Preços sem frete, lidos agora nas páginas públicas das lojas.</p>
        </div>
      )}
    </Painel>
  );
}
