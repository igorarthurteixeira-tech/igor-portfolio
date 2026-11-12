"use client";

import { useEffect, useState } from "react";
import {
  AMPLIACOES,
  CATALOGO_ITENS,
  METROS_POR_AMPLIACAO,
  montarLayout,
  MAX_ITENS,
  ESTACOES,
  MODELOS_MESA,
  verificarAlvo,
  TAMANHOS_COMODO,
  precoItem,
  verificar,
  type Config,
  type EstacaoId,
  type Layout,
  type Mesa,
  type ModeloMesa,
  type Papel,
  type TipoItem,
} from "./planta";
import type { Colocando } from "./Escritorio3D";

/** Preço em moedas (a loja de moedas ainda não está ativa: por enquanto é só informativo). */
function Preco({ valor }: { valor: number }) {
  if (!valor) return <span className="text-[10px] text-emerald-300">incluída</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-200">
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
        <path d="M8 4.5v7M6 6.2h3.2a1.2 1.2 0 0 1 0 2.4H6.8a1.2 1.2 0 0 0 0 2.4H10" stroke="#78350f" strokeWidth="1.2" fill="none" />
      </svg>
      {valor}
    </span>
  );
}

type Funcionario = { id: string; nome: string; papel: Papel };

const PAREDES = ["#24304f", "#1f2937", "#3f2d20", "#14532d", "#4c1d95", "#7f1d1d", "#cbd5e1", "#f5f5f4"];
const PISOS: [string, string][] = [
  ["#eef2fd", "#e1e7f8"],
  ["#f5f5f4", "#e7e5e4"],
  ["#d6b98c", "#c9a978"],
  ["#3f3f46", "#27272a"],
  ["#ecfccb", "#d9f99d"],
  ["#fde2e4", "#fbcfe8"],
];
const MADEIRAS = ["#b08d62", "#8b5a2b", "#e7d3b0", "#3f3f46", "#f8fafc"];
const DESTAQUES = ["#0f46e6", "#16a34a", "#dc2626", "#f59e0b", "#9333ea", "#0891b2"];
const UNIFORMES = ["#0f46e6", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04", "#0891b2", "#1e293b", "#e11d48", "#f8fafc"];
type Aba = "moveis" | "decoracao" | "equipamentos" | "comodos" | "mesas" | "estilo" | "equipe";
const ABAS: { id: Aba; nome: string; itens: TipoItem[] }[] = [
  { id: "moveis", nome: "Móveis", itens: ["mesa_reuniao", "mesa_centro", "sofa", "estante", "divisoria", "cabine"] },
  { id: "decoracao", nome: "Decoração", itens: ["planta", "luminaria", "tapete", "quadro"] },
  { id: "equipamentos", nome: "Equipamentos", itens: ["bebedouro", "impressora"] },
  { id: "comodos", nome: "Cômodos", itens: ["sala_reuniao", "copa", "sala_descanso"] },
  { id: "mesas", nome: "Mesas da equipe", itens: [] },
  { id: "estilo", nome: "Estilo", itens: [] },
  { id: "equipe", nome: "Equipe", itens: [] },
];

/** Cartão da loja: miniatura gerada do modelo 3D, nome e preço. */
function Cartao({
  foto,
  nome,
  preco,
  ativo,
  aoClicar,
  titulo,
}: {
  foto?: string;
  nome: string;
  preco: number;
  ativo: boolean;
  aoClicar: () => void;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      title={titulo}
      className={`flex w-28 shrink-0 flex-col items-center rounded-xl p-1.5 text-center transition ${
        ativo ? "bg-white/20 ring-2 ring-accent-light" : "bg-white/6 hover:bg-white/12"
      }`}
    >
      <span className="grid h-16 w-full place-items-center overflow-hidden rounded-lg bg-white/5">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-slate-500">...</span>
        )}
      </span>
      <span className="mt-1 line-clamp-1 text-[11px] text-white">{nome}</span>
      <Preco valor={preco} />
    </button>
  );
}

function Amostras({ cores, valor, aoEscolher, rotulo }: { cores: string[]; valor: string; aoEscolher: (c: string) => void; rotulo: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={rotulo}>
      {cores.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={c}
          onClick={() => aoEscolher(c)}
          className={`h-7 w-7 rounded-full border-2 transition ${valor === c ? "scale-110 border-white" : "border-white/20 hover:border-white/60"}`}
          style={{ background: c }}
        />
      ))}
      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-white/40" title="Outra cor">
        <input type="color" value={valor} onChange={(e) => aoEscolher(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        <span className="grid h-full place-items-center text-xs text-white">+</span>
      </label>
    </div>
  );
}

/**
 * Personalização. O rascunho (`cfg`) aparece na hora no escritório; só vale depois de salvar.
 * "Arrumar o escritório" troca o painel por uma barra de edição: arrastar, girar, adicionar e remover itens.
 */
export default function Personalizar({
  nomeInicial,
  configSalva,
  cfg,
  aoMudar,
  layout,
  funcionarios,
  corPadrao,
  plano,
  selecionado,
  aoSelecionar,
  miniaturas,
  colocando,
  aoColocando,
  aoSalvar,
  aoFechar,
}: {
  nomeInicial: string;
  configSalva: Config;
  cfg: Config;
  aoMudar: (c: Config) => void;
  layout: Layout;
  funcionarios: Funcionario[];
  corPadrao: (id: string) => string;
  plano: "gratis" | "pago";
  selecionado: string | null;
  aoSelecionar: (id: string | null) => void;
  mensagem?: string;
  miniaturas: Record<string, string>;
  colocando: Colocando;
  aoColocando: (c: Colocando) => void;
  aoSalvar: (nome: string, c: Config, nomes: Record<string, string>) => Promise<boolean>;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [nomes, setNomes] = useState<Record<string, string>>(() => Object.fromEntries(funcionarios.map((f) => [f.id, f.nome])));
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [aba, setAba] = useState<Aba>("moveis");
  const bloqueado = plano !== "pago";
  const mudar = (parcial: Partial<Config>) => aoMudar({ ...cfg, ...parcial });
  const item = cfg.itens.find((i) => i.id === selecionado) ?? null;
  const chaveMesa = selecionado?.startsWith("mesa:") ? selecionado.slice(5) : null;
  const mesa = chaveMesa ? layout.mesas[chaveMesa] : null;
  const donoMesa = chaveMesa ? layout.agentes.find((a) => a.chave === chaveMesa) : null;
  const estacaoId = selecionado?.startsWith("estacao:") ? (selecionado.slice(8) as EstacaoId) : null;
  const estacao = estacaoId ? layout.estacoes[estacaoId] : null;
  /** Verde/vermelho do escolhido, com o motivo (a mesma regra da cena). */
  const situacaoEscolhido = selecionado ? verificarAlvo({ layout, itens: cfg.itens }, selecionado) : null;

  /** Aplica uma mudança só se a sala continuar válida; senão mostra o motivo. */
  function tentar(itens: typeof cfg.itens, mesas: Record<string, Mesa>, depois?: () => void) {
    mudar({ itens, mesas: { ...cfg.mesas, ...mesas } });
    depois?.();
    setAviso("");
  }

  /** Escolhe um item da loja: o próximo clique no escritório diz onde ele fica. */
  function escolher(tipo: TipoItem) {
    if (colocando?.tipo === tipo) return aoColocando(null);
    if (cfg.itens.length >= MAX_ITENS) return setAviso(`Cabem até ${MAX_ITENS} itens.`);
    setAviso("");
    aoSelecionar(null);
    aoColocando({ tipo, rot: 0 });
  }
  function girar() {
    if (item && !CATALOGO_ITENS[item.tipo].parede) {
      const girado = { ...item, rot: (item.rot + 1) % 4 };
      tentar(cfg.itens.map((i) => (i.id === item.id ? girado : i)), {});
    } else if (mesa && chaveMesa) {
      tentar(cfg.itens, { [chaveMesa]: { ...mesa, rot: (mesa.rot + 1) % 4 } });
    } else if (estacao && estacaoId && !ESTACOES[estacaoId].parede) {
      mudar({ estacoes: { ...cfg.estacoes, [estacaoId]: { ...estacao, rot: (estacao.rot + 1) % 4 } } });
      setAviso("");
    }
  }
  function trocarModelo(modelo: ModeloMesa, chave = chaveMesa) {
    const m = chave ? layout.mesas[chave] : null;
    if (m && chave) tentar(cfg.itens, { [chave]: { ...m, modelo } });
  }
  /** Amplia ou reduz a sala para a frente ou para a direita (reduzir só se nada ficar para fora). */
  function mudarAmpliacao(direcao: "frente" | "lado", delta: number) {
    const campo = direcao === "frente" ? "ampliacao" : "ampliacaoLateral";
    const nova = Math.max(0, Math.min(AMPLIACOES.length, cfg[campo] + delta));
    if (nova === cfg[campo]) return;
    const novoLayout = montarLayout(
      layout.agentes.map((a) => ({ chave: a.chave, papel: a.papel, nome: a.nome })),
      cfg.mesas,
      direcao === "frente" ? nova : cfg.ampliacao,
      direcao === "lado" ? nova : cfg.ampliacaoLateral,
      cfg.estacoes,
    );
    void novoLayout;
    setAviso("");
    mudar({ [campo]: nova });
  }
  /** Botões de ampliar/reduzir de uma direção. */
  const controleAmpliacao = (direcao: "frente" | "lado", compacto = false) => {
    const nivel = direcao === "frente" ? cfg.ampliacao : cfg.ampliacaoLateral;
    const proxima = AMPLIACOES[nivel];
    const rotulo = direcao === "frente" ? "para a frente" : "para a direita";
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-400">
          {compacto ? (direcao === "frente" ? "Frente" : "Direita") : `Ampliar ${rotulo}`}: {nivel}/{AMPLIACOES.length}
        </span>
        {proxima ? (
          <button
            type="button"
            onClick={() => mudarAmpliacao(direcao, 1)}
            title={`Aumenta a sala ${rotulo} em ${METROS_POR_AMPLIACAO.toString().replace(".", ",")} m`}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-emerald-100 hover:bg-emerald-500/30"
          >
            {direcao === "frente" ? "↓" : "→"} +{METROS_POR_AMPLIACAO.toString().replace(".", ",")} m <Preco valor={proxima.preco} />
          </button>
        ) : (
          <span className="text-slate-400">(máximo)</span>
        )}
        {nivel > 0 && (
          <button type="button" onClick={() => mudarAmpliacao(direcao, -1)} className="rounded-lg bg-white/10 px-2 py-1.5 hover:bg-white/20" title="Reduzir um nível">
            −
          </button>
        )}
      </span>
    );
  };

  /** Muda o tamanho do cômodo escolhido (só se ainda couber). */
  function redimensionar(tam: number) {
    if (!item || !CATALOGO_ITENS[item.tipo].comodo) return;
    const itens = cfg.itens.map((i) => (i.id === item.id ? { ...i, tam } : i));
    mudar({ itens });
    const r = verificar({ layout, itens });
    setAviso(r.ok ? "" : `${r.motivo} Arraste para um lugar onde caiba antes de salvar.`);
  }

  function remover() {
    if (!item) return;
    mudar({ itens: cfg.itens.filter((i) => i.id !== item.id) });
    aoSelecionar(null);
  }

  // atalhos no modo de edição: R gira, Delete remove, Esc termina
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "r" || e.key === "R") {
        if (colocando) aoColocando({ ...colocando, rot: (colocando.rot + 1) % 4 });
        else girar();
      } else if (e.key === "Delete" || e.key === "Backspace") remover();
      else if (e.key === "Escape" && colocando) aoColocando(null);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const situacaoSala = verificar({ layout, itens: cfg.itens });

  async function salvar() {
    const r = verificar({ layout, itens: cfg.itens });
    if (!r.ok) return setAviso(`Ainda não dá para salvar: ${r.motivo}`);
    setSalvando(true);
    const ok = await aoSalvar(nome, cfg, nomes);
    setSalvando(false);
    if (ok) aoFechar();
  }
  const cancelar = () => {
    aoMudar(configSalva);
    aoFechar();
  };

  {
    const contagem = (t: TipoItem) => cfg.itens.filter((i) => i.tipo === t).length;
    const abaAtual = ABAS.find((a) => a.id === aba)!;
    return (
      <div className="fixed inset-x-0 bottom-0 z-90 border-t border-white/15 bg-[#0b1230]/95 px-3 pb-3 pt-2 text-white shadow-2xl backdrop-blur sm:px-4">
        <div className="mx-auto max-w-6xl">
          {/* abas */}
          <div className="flex flex-wrap items-center gap-1 border-b border-white/10 pb-2">
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${aba === a.id ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {a.nome}
              </button>
            ))}
            <span className="ml-auto flex flex-wrap items-center gap-3">
              {controleAmpliacao("frente", true)}
              {controleAmpliacao("lado", true)}
            </span>
            <button type="button" onClick={cancelar} className="btn-ghost py-2! px-4!">
              Cancelar
            </button>
            <button type="button" disabled={bloqueado || salvando} onClick={salvar} className="btn-primary py-2! px-5!">
              {salvando ? "Salvando..." : bloqueado ? "Plano pago" : "Salvar"}
            </button>
          </div>

          {aba === "comodos" && (
            <p className="pt-2 text-[11px] text-violet-200">
              Cômodos podem ficar dentro da sala ou <strong>encostados nela pela frente ou pela direita</strong>, ampliando o escritório.
              A porta precisa dar para dentro. Depois de colocar, escolha o tamanho: pequeno, médio ou grande.
            </p>
          )}
          {bloqueado && (
            <p className="pt-2 text-[11px] text-amber-200">A personalização faz parte do plano pago: dá para experimentar, mas não para salvar.</p>
          )}
          {/* vitrine da aba */}
          <div className="flex gap-2 overflow-x-auto py-2">
            {aba === "estilo" ? (
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Nome do escritório
                  <input
                    value={nome}
                    maxLength={40}
                    onChange={(e) => setNome(e.target.value)}
                    className="mt-1 block w-56 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-accent-light"
                  />
                </label>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paredes</p>
                  <Amostras rotulo="Cor das paredes" cores={PAREDES} valor={cfg.parede} aoEscolher={(c) => mudar({ parede: c })} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Piso</p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Piso">
                    {PISOS.map((pp) => {
                      const ativo = cfg.piso[0] === pp[0] && cfg.piso[1] === pp[1];
                      return (
                        <button
                          key={pp.join()}
                          type="button"
                          role="radio"
                          aria-checked={ativo}
                          onClick={() => mudar({ piso: pp })}
                          className={`h-7 w-7 overflow-hidden rounded-lg border-2 ${ativo ? "border-white" : "border-white/20 hover:border-white/60"}`}
                          style={{ background: `conic-gradient(${pp[1]} 0 25%, ${pp[0]} 0 50%, ${pp[1]} 0 75%, ${pp[0]} 0)` }}
                          aria-label={`Piso ${pp.join(" e ")}`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Madeira das mesas</p>
                  <Amostras rotulo="Cor das mesas" cores={MADEIRAS} valor={cfg.madeira} aoEscolher={(c) => mudar({ madeira: c })} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faixa e detalhes</p>
                  <Amostras rotulo="Cor de destaque" cores={DESTAQUES} valor={cfg.destaque} aoEscolher={(c) => mudar({ destaque: c })} />
                </div>
              </div>
            ) : aba === "equipe" ? (
              funcionarios.map((f) => (
                <div key={f.id} className="w-60 shrink-0 rounded-xl bg-white/5 p-2">
                  <input
                    value={nomes[f.id] ?? ""}
                    maxLength={24}
                    onChange={(e) => setNomes({ ...nomes, [f.id]: e.target.value })}
                    aria-label={`Nome do ${f.papel}`}
                    className="mb-1.5 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-sm outline-none focus:border-accent-light"
                  />
                  <Amostras
                    rotulo={`Uniforme de ${nomes[f.id]}`}
                    cores={UNIFORMES}
                    valor={cfg.uniformes[f.id] ?? corPadrao(f.id)}
                    aoEscolher={(c) => mudar({ uniformes: { ...cfg.uniformes, [f.id]: c } })}
                  />
                </div>
              ))
            ) : aba === "mesas" ? (
              mesa && donoMesa ? (
                (Object.keys(MODELOS_MESA) as ModeloMesa[]).map((m) => (
                  <Cartao
                    key={m}
                    foto={miniaturas[`mesa:${m}`]}
                    nome={MODELOS_MESA[m].nome}
                    preco={MODELOS_MESA[m].preco}
                    ativo={mesa.modelo === m}
                    titulo={MODELOS_MESA[m].descricao}
                    aoClicar={() => trocarModelo(m)}
                  />
                ))
              ) : (
                <p className="py-6 text-sm text-slate-400">Clique na mesa de alguém no escritório para trocar o modelo dela.</p>
              )
            ) : (
              abaAtual.itens.map((t) => (
                <Cartao
                  key={t}
                  foto={miniaturas[t]}
                  nome={`${CATALOGO_ITENS[t].nome}${contagem(t) ? ` (${contagem(t)})` : ""}`}
                  preco={CATALOGO_ITENS[t].preco}
                  ativo={colocando?.tipo === t}
                  aoClicar={() => escolher(t)}
                />
              ))
            )}
          </div>

          {/* o que está acontecendo */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {colocando ? (
              <>
                <span>
                  Clique no escritório onde quer colocar <strong>{CATALOGO_ITENS[colocando.tipo].artigo} {CATALOGO_ITENS[colocando.tipo].nome.toLowerCase()}</strong>.
                </span>
                {!CATALOGO_ITENS[colocando.tipo].parede && (
                  <button type="button" onClick={() => aoColocando({ ...colocando, rot: (colocando.rot + 1) % 4 })} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                    ↻ Girar (R)
                  </button>
                )}
                <button type="button" onClick={() => aoColocando(null)} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                  Cancelar (Esc)
                </button>
              </>
            ) : item ? (
              <>
                <span>
                  Selecionado: <strong>{CATALOGO_ITENS[item.tipo].nome}</strong> · arraste para mover
                </span>
                {!CATALOGO_ITENS[item.tipo].parede && (
                  <button type="button" onClick={girar} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                    ↻ Girar (R)
                  </button>
                )}
                <button type="button" onClick={remover} className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/30">
                  Remover (Del)
                </button>
                {CATALOGO_ITENS[item.tipo].comodo && (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Tamanho:</span>
                    {TAMANHOS_COMODO.map((t, i) => (
                      <button
                        key={t.nome}
                        type="button"
                        onClick={() => redimensionar(i)}
                        aria-pressed={(item.tam ?? 0) === i}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                          (item.tam ?? 0) === i ? "bg-white/20 ring-1 ring-accent-light" : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {t.nome} <Preco valor={precoItem(item.tipo, i)} />
                      </button>
                    ))}
                  </span>
                )}
              </>
            ) : estacao && estacaoId ? (
              <>
                <span>
                  <strong>{ESTACOES[estacaoId].nome}</strong> · arraste para mover
                  {ESTACOES[estacaoId].parede ? " pela parede" : ""}; o lugar de trabalho vai junto
                </span>
                {!ESTACOES[estacaoId].parede && (
                  <button type="button" onClick={girar} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                    ↻ Girar (R)
                  </button>
                )}
              </>
            ) : mesa && donoMesa ? (
              <>
                <span>
                  Mesa de <strong>{donoMesa.nome}</strong> ({MODELOS_MESA[mesa.modelo].nome}) · arraste para mover
                </span>
                <button type="button" onClick={girar} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                  ↻ Girar (R)
                </button>
                {aba !== "mesas" && (
                  <button type="button" onClick={() => setAba("mesas")} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                    Trocar modelo
                  </button>
                )}
              </>
            ) : (
              <span className="text-slate-400">Escolha um item acima e clique no escritório para colocar, ou clique numa mesa ou item para mover.</span>
            )}
            {situacaoEscolhido && !situacaoEscolhido.ok && (
              <span className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-100">✕ {situacaoEscolhido.motivo}</span>
            )}
            {situacaoSala.ok ? (
              !colocando && aviso && <span className="text-xs text-amber-200">{aviso}</span>
            ) : (
              <span className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-100">
                ⚠ {situacaoSala.motivo} Ajuste antes de salvar.
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-500">Preços em moedas, ainda não cobrados.</span>
          </div>
        </div>
      </div>
    );
  }
}
