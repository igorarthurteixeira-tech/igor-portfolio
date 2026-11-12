"use client";

import { useState } from "react";
import type { Produto } from "@/lib/escritorio/fonte";
import { dinheiro, type EventoGravado, type OfertaAtual } from "@/lib/escritorio/eventos";

export type Ponto = { t: string; preco: number; loja: string };

const COR_LINHA = "#5b8cff";
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const compacto = (v: number) => `R$ ${(v / 1000).toFixed(1).replace(".", ",")} mil`;

export function Painel({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/4 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200/80">{titulo}</h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

function Variacao({ atual, anterior }: { atual: number; anterior?: number }) {
  if (anterior === undefined) return <span className="text-[11px] text-slate-400">1ª coleta</span>;
  const v = (atual - anterior) / anterior;
  if (Math.abs(v) < 0.0005) return <span className="text-[11px] text-slate-400">= estável</span>;
  const caiu = v < 0;
  return (
    <span className={`text-[11px] font-semibold ${caiu ? "text-emerald-300" : "text-rose-300"}`}>
      {caiu ? "▼" : "▲"} {Math.abs(v * 100).toFixed(1).replace(".", ",")}%
    </span>
  );
}

/** Último preço de cada produto, com a variação em relação à coleta anterior. */
export function UltimosPrecos({
  catalogo,
  historico,
  foco,
  emPesquisa,
  semEstoque,
  contratados,
  aoEscolher,
}: {
  catalogo: Produto[];
  historico: Record<string, Ponto[]>;
  foco: string;
  emPesquisa: string | null;
  semEstoque: Set<string>;
  /** com escritório: produtos com contrato em andamento (sem escritório: undefined = base geral) */
  contratados?: Set<string>;
  aoEscolher: (id: string) => void;
}) {
  return (
    <Painel
      titulo={contratados ? "Preços do seu escritório" : "Preços recentes"}
      extra={!contratados && <span className="text-[11px] text-slate-400">base geral</span>}
    >
      <ul className="-mx-1 space-y-1">
        {catalogo.map((p) => {
          const pts = historico[p.id] ?? [];
          const ultimo = pts[pts.length - 1];
          const anterior = pts[pts.length - 2];
          const ativo = emPesquisa === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => aoEscolher(p.id)}
                aria-pressed={foco === p.id}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                  ativo ? "bg-amber-300/15 ring-1 ring-amber-300/60" : foco === p.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{p.nome}</span>
                  <span className="block text-[11px] text-slate-400">
                    {ativo
                      ? "pesquisando agora..."
                      : semEstoque.has(p.id)
                        ? "sem estoque na última rodada"
                        : ultimo
                          ? `${ultimo.loja} · ${dataHora(ultimo.t)}${contratados && !contratados.has(p.id) ? " · contrato encerrado" : ""}`
                          : !contratados
                            ? "ainda sem coleta"
                            : contratados.has(p.id)
                              ? "aguardando a 1ª coleta"
                              : "sem contrato"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-white">{ultimo ? dinheiro(ultimo.preco) : "-"}</span>
                  {ultimo && <Variacao atual={ultimo.preco} anterior={anterior?.preco} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">Clique num produto para ver o gráfico.</p>
    </Painel>
  );
}

/** Onde o pesquisador esteve na última rodada: preços achados e falhas por loja. */
export function OndePesquisou({ eventos, lojaAtiva, fonte }: { eventos: EventoGravado[]; lojaAtiva: string | null; fonte: string }) {
  const lojas = new Map<string, { achados: number; semEstoque: number; falhas: number; vendedores: Set<string> }>();
  const pegar = (nome: string) => {
    const l = lojas.get(nome) ?? { achados: 0, semEstoque: 0, falhas: 0, vendedores: new Set<string>() };
    lojas.set(nome, l);
    return l;
  };
  for (const e of eventos) {
    if (e.tipo === "preco_coletado" || e.tipo === "sem_estoque") {
      const l = pegar(e.dados.loja);
      if (e.tipo === "preco_coletado") l.achados++;
      else l.semEstoque++;
      if (e.dados.vendedor && e.dados.vendedor !== e.dados.loja) l.vendedores.add(e.dados.vendedor);
    } else if (e.tipo === "loja_falhou") pegar(e.dados.loja).falhas++;
  }
  const lista = [...lojas.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <Painel titulo="Onde pesquisou" extra={<span className="text-[11px] text-slate-400">última rodada</span>}>
      {lista.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma loja visitada ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map(([nome, l]) => (
            <li
              key={nome}
              className={`rounded-lg px-2 py-1.5 text-sm transition ${
                lojaAtiva === nome ? "bg-amber-300/15 ring-1 ring-amber-300/60" : "bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-white">{nome}</span>
                <span className="text-[11px] text-slate-300">
                  {l.achados} preço{l.achados === 1 ? "" : "s"}
                  {l.semEstoque > 0 && <span className="ml-2 text-amber-200">{l.semEstoque} sem estoque</span>}
                  {l.falhas > 0 && <span className="ml-2 text-rose-300">✕ {l.falhas} sem resposta</span>}
                </span>
              </div>
              {l.vendedores.size > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-400">Vendedores: {[...l.vendedores].join(", ")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-slate-400">Fonte: {fonte}</p>
    </Painel>
  );
}

/** Ficha do produto escolhido: foto, marca, modelo, destaques e as ofertas vistas na última rodada. */
export function FichaProduto({ produto, ofertas }: { produto: Produto | undefined; ofertas: OfertaAtual[] }) {
  if (!produto) return null;
  const imagem = ofertas.find((o) => o.imagem)?.imagem;
  const ordenadas = [...ofertas].sort((a, b) => Number(b.disponivel) - Number(a.disponivel) || (a.preco ?? Infinity) - (b.preco ?? Infinity));
  return (
    <Painel titulo="Ficha do produto">
      <div className="flex gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt={produto.nome} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="px-1 text-center text-[10px] text-slate-400">sem foto ainda</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{produto.nome}</p>
          <p className="text-[11px] text-slate-400">
            {produto.marca} · modelo {produto.modelo}
          </p>
          <ul className="mt-1 text-[11px] leading-snug text-slate-300">
            {produto.destaques.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ofertas na última rodada</p>
      {ordenadas.length === 0 ? (
        <p className="text-[11px] text-slate-400">Nenhuma oferta visitada ainda.</p>
      ) : (
        <ul className="space-y-1">
          {ordenadas.map((o, i) => (
            <li key={o.url + o.vendedor} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span className="min-w-0">
                <span className="block truncate text-slate-200">
                  {o.loja}
                  {o.vendedor && o.vendedor !== o.loja ? ` · ${o.vendedor}` : ""}
                </span>
                <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-300 hover:underline">
                  ver na loja ↗
                </a>
              </span>
              <span className="shrink-0 text-right">
                {o.disponivel && o.preco !== null ? (
                  <span className="block text-sm font-semibold tabular-nums text-white">{dinheiro(o.preco)}</span>
                ) : (
                  <span className="block text-amber-200">sem estoque</span>
                )}
                {i === 0 && o.disponivel && o.preco !== null && <span className="text-emerald-300">melhor oferta</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

/** Linha do preço ao longo do tempo, com cruz e dica ao passar o mouse. */
export function GraficoPreco({ produto, pontos }: { produto: Produto | undefined; pontos: Ponto[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 160;
  const m = { l: 52, r: 12, t: 12, b: 22 };

  if (!produto || pontos.length < 2) {
    return (
      <Painel titulo="Gráfico">
        <p className="text-sm text-slate-400">
          {produto ? `${produto.nome}: o gráfico aparece a partir da 2ª coleta.` : "Escolha um produto."}
        </p>
      </Painel>
    );
  }

  const ts = pontos.map((p) => new Date(p.t).getTime());
  const vs = pontos.map((p) => p.preco);
  const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
  const folga = (Math.max(...vs) - Math.min(...vs)) * 0.15 || Math.max(...vs) * 0.02;
  const [y0, y1] = [Math.min(...vs) - folga, Math.max(...vs) + folga];
  const x = (t: number) => m.l + ((t - t0) / (t1 - t0 || 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(ts[i]).toFixed(1)},${y(p.preco).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(t1)},${H - m.b} L${x(t0)},${H - m.b} Z`;
  const marcas = [y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15];
  const ultimo = pontos.length - 1;
  const h = hover ?? null;

  function mover(ev: React.PointerEvent<SVGSVGElement>) {
    const r = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let melhor = 0;
    for (let i = 1; i < ts.length; i++) if (Math.abs(x(ts[i]) - px) < Math.abs(x(ts[melhor]) - px)) melhor = i;
    setHover(melhor);
  }

  return (
    <Painel titulo="Gráfico" extra={<span className="truncate text-[11px] text-slate-300">{produto.nome}</span>}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={`Preço de ${produto.nome} em ${pontos.length} coletas, de ${dinheiro(Math.min(...vs))} a ${dinheiro(Math.max(...vs))}`}
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={() => setHover(null)}
        >
          {marcas.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity="0.08" />
              <text x={m.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {compacto(v)}
              </text>
            </g>
          ))}
          <text x={m.l} y={H - 6} fontSize="9" fill="#94a3b8">{dataHora(pontos[0].t)}</text>
          <text x={W - m.r} y={H - 6} textAnchor="end" fontSize="9" fill="#94a3b8">{dataHora(pontos[ultimo].t)}</text>
          <path d={area} fill={COR_LINHA} fillOpacity="0.1" />
          <path d={linha} fill="none" stroke={COR_LINHA} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {h !== null && <line x1={x(ts[h])} x2={x(ts[h])} y1={m.t} y2={H - m.b} stroke="#ffffff" strokeOpacity="0.35" strokeDasharray="3 3" />}
          {[h ?? ultimo].map((i) => (
            <circle key={i} cx={x(ts[i])} cy={y(vs[i])} r="4" fill={COR_LINHA} stroke="#0b1230" strokeWidth="2" />
          ))}
        </svg>
        {h !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-white/15 bg-[#0b1230] px-2 py-1 text-[11px] leading-tight text-white shadow-lg"
            style={{ left: `${(x(ts[h]) / W) * 100}%`, transform: `translateX(${x(ts[h]) > W / 2 ? "-105%" : "5%"})` }}
          >
            <p className="font-semibold tabular-nums">{dinheiro(vs[h])}</p>
            <p className="text-slate-300">{pontos[h].loja} · {dataHora(pontos[h].t)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-300">
        <span>Menor: <strong className="text-white tabular-nums">{dinheiro(Math.min(...vs))}</strong></span>
        <span>Maior: <strong className="text-white tabular-nums">{dinheiro(Math.max(...vs))}</strong></span>
        <span>Coletas: <strong className="text-white">{pontos.length}</strong></span>
      </div>
      <details className="mt-2 text-[11px] text-slate-300">
        <summary className="cursor-pointer text-slate-400 hover:text-white">Ver em tabela</summary>
        <table className="mt-1 w-full">
          <tbody>
            {[...pontos].reverse().slice(0, 12).map((p) => (
              <tr key={p.t} className="border-t border-white/5">
                <td className="py-0.5">{dataHora(p.t)}</td>
                <td>{p.loja}</td>
                <td className="text-right tabular-nums text-white">{dinheiro(p.preco)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Painel>
  );
}

/** Cartão de um produto monitorado: o resultado do trabalho do escritório. */
export function CartaoProduto({
  produto,
  pontos,
  ofertas,
  contrato,
  aberto,
  pesquisando,
  semEstoque,
  aoAbrir,
}: {
  produto: Produto;
  pontos: Ponto[];
  ofertas: OfertaAtual[];
  contrato?: { pesquisador: string; restante: string } | "encerrado" | null;
  aberto: boolean;
  pesquisando: boolean;
  semEstoque: boolean;
  aoAbrir: () => void;
}) {
  const ultimo = pontos[pontos.length - 1];
  const anterior = pontos[pontos.length - 2];
  const menor = pontos.length ? Math.min(...pontos.map((p) => p.preco)) : null;
  const imagem = ofertas.find((o) => o.imagem)?.imagem;
  const melhor = [...ofertas].filter((o) => o.disponivel && o.preco !== null).sort((a, b) => (a.preco ?? 0) - (b.preco ?? 0))[0];
  // mini gráfico
  let linha = "";
  if (pontos.length > 1) {
    const vs = pontos.map((p) => p.preco);
    const [mn, mx] = [Math.min(...vs), Math.max(...vs)];
    linha = pontos.map((p, i) => `${i ? "L" : "M"}${((i / (pontos.length - 1)) * 120).toFixed(1)},${(26 - ((p.preco - mn) / (mx - mn || 1)) * 22).toFixed(1)}`).join(" ");
  }
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-pressed={aberto}
      className={`flex min-w-0 flex-col rounded-2xl border p-3 text-left transition ${
        pesquisando
          ? "border-amber-300/70 bg-amber-300/10"
          : aberto
            ? "border-accent-light/70 bg-white/8"
            : "border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/6"
      }`}
    >
      <div className="flex gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[9px] text-slate-400">sem foto</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">{produto.nome}</span>
          <span className="block text-[11px] text-slate-400">
            {produto.marca} · {produto.modelo}
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span>
          <span className="block text-[10px] uppercase tracking-wide text-slate-400">{pesquisando ? "pesquisando agora..." : "melhor preço"}</span>
          {semEstoque ? (
            <span className="text-lg font-bold text-amber-200">sem estoque</span>
          ) : ultimo ? (
            <span className="text-2xl font-bold tabular-nums text-white">{dinheiro(ultimo.preco)}</span>
          ) : (
            <span className="text-sm text-slate-300">aguardando a 1ª coleta</span>
          )}
        </span>
        {ultimo && !semEstoque && <Variacao atual={ultimo.preco} anterior={anterior?.preco} />}
      </div>

      {linha && (
        <svg viewBox="0 0 120 28" className="mt-2 h-8 w-full" preserveAspectRatio="none" aria-hidden>
          <path d={linha} fill="none" stroke="#5b8cff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      )}

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-300">
        {menor !== null && (
          <p>
            menor visto <strong className="tabular-nums text-white">{dinheiro(menor)}</strong> · {pontos.length} coleta{pontos.length === 1 ? "" : "s"}
          </p>
        )}
        {melhor && (
          <p className="truncate">
            {melhor.loja}
            {melhor.vendedor && melhor.vendedor !== melhor.loja ? ` · ${melhor.vendedor}` : ""} · {dataHora(melhor.coletado_em)}
          </p>
        )}
      </div>

      {contrato && (
        <span
          className={`mt-2 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            contrato === "encerrado" ? "bg-white/10 text-slate-300" : "bg-amber-300 text-amber-950"
          }`}
        >
          {contrato === "encerrado" ? "contrato encerrado" : `⏱ ${contrato.pesquisador} · ${contrato.restante}`}
        </span>
      )}
    </button>
  );
}

/** Cartão para começar a monitorar mais um produto. */
export function CartaoNovo({ titulo, detalhe, aoClicar }: { titulo: string; detalhe: string; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 p-4 text-center transition hover:border-accent-light hover:bg-white/5"
    >
      <span className="text-3xl leading-none text-blue-300">+</span>
      <span className="mt-2 text-sm font-semibold text-white">{titulo}</span>
      <span className="mt-1 text-[11px] text-slate-400">{detalhe}</span>
    </button>
  );
}
