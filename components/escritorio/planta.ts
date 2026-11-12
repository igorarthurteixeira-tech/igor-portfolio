// Planta do escritório.
// Posições das pessoas ficam numa "planta baixa" (x de 0 a 800, y cresce para a frente da sala);
// móveis e itens ficam em coordenadas do mundo 3D (x de -10,3 a 10,3; z de -4,3 até a frente).
// Converte-se com `mundo()` (planta → mundo) e `praPlanta()` (mundo → planta).

export type Papel = "pesquisador" | "analista" | "comprador";
/** Chave de cada pessoa na cena: o id do funcionário (ou o papel, na demonstração sem conta). */
export type Id = string;
export type Pos = { x: number; y: number };
export type Vis = { x: number; y: number; andando: boolean; dur: number };

export const VELOCIDADE = 0.12; // unidades da planta por milissegundo
export const MAX_PESQUISADORES = 10;

export const mundo = (p: Pos) => ({ x: (p.x - 400) / 40, z: (p.y - 230) / 40 });
export const praPlanta = (x: number, z: number): Pos => ({ x: x * 40 + 400, y: z * 40 + 230 });

/** Porta da parede esquerda: quem é contratado entra por aqui (fixa, faz parte da parede). */
export const PORTA: Pos = { x: 30, y: 450 };
export const PORTA_Z = (450 - 230) / 40;

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------
export type Retangulo = { x1: number; z1: number; x2: number; z2: number };
const ret = (x1: number, z1: number, x2: number, z2: number): Retangulo => ({
  x1: Math.min(x1, x2),
  z1: Math.min(z1, z2),
  x2: Math.max(x1, x2),
  z2: Math.max(z1, z2),
});
export const cruza = (a: Retangulo, b: Retangulo) => a.x1 < b.x2 - 1e-6 && b.x1 < a.x2 - 1e-6 && a.z1 < b.z2 - 1e-6 && b.z1 < a.z2 - 1e-6;
const dentro = (r: Retangulo, x: number, z: number) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;

/** Gira um ponto local (lx, lz) em quartos de volta, do mesmo jeito que o three.js gira em y. */
export function rotacionar(lx: number, lz: number, rot: number) {
  const t = (rot * Math.PI) / 2;
  const c = Math.round(Math.cos(t));
  const s = Math.round(Math.sin(t));
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}
/** Retângulo local (em volta da origem do objeto) girado e levado para (x, z). */
function retLocal(x: number, z: number, rot: number, lx1: number, lz1: number, lx2: number, lz2: number): Retangulo {
  const a = rotacionar(lx1, lz1, rot);
  const b = rotacionar(lx2, lz2, rot);
  return ret(x + a.x, z + a.z, x + b.x, z + b.z);
}

// ---------------------------------------------------------------------------
// Móveis de trabalho (podem ser movidos e girados; o lugar de trabalho vai junto)
// ---------------------------------------------------------------------------
export type EstacaoId = "arquivo" | "lojas" | "cafe" | "quadro";
/** Centro do móvel (mundo) e giro em quartos de volta; a frente (onde a pessoa fica) é o lado +z local. */
export type Estacao = { x: number; z: number; rot: number };
export const ESTACOES: Record<EstacaoId, { nome: string; artigo: "a" | "o"; w: number; d: number; parede?: boolean; frente: number; padrao: Estacao }> = {
  arquivo: { nome: "Arquivo", artigo: "o", w: 2.9, d: 0.8, frente: 1.75, padrao: { x: -7.85, z: -2.5, rot: 0 } },
  lojas: { nome: "Prateleira das lojas", artigo: "a", w: 4.4, d: 0.9, frente: 1.925, padrao: { x: 7.4, z: -2.55, rot: 0 } },
  cafe: { nome: "Máquina de café", artigo: "a", w: 0.9, d: 1.2, frente: 1.45, padrao: { x: -9.15, z: 2.3, rot: 1 } },
  quadro: { nome: "Quadro de avisos", artigo: "o", w: 4.2, d: 0.1, parede: true, frente: 1.32, padrao: { x: 0, z: -4.27, rot: 0 } },
};
export const ESTACAO_IDS = Object.keys(ESTACOES) as EstacaoId[];
export const pegadaEstacao = (id: EstacaoId, e: Estacao): Retangulo => {
  const t = ESTACOES[id];
  return retLocal(e.x, e.z, e.rot, -t.w / 2, -t.d / 2, t.w / 2, t.d / 2);
};
const pontoLocal = (e: Estacao, lx: number, lz: number): Pos => {
  const o = rotacionar(lx, lz, e.rot);
  return praPlanta(e.x + o.x, e.z + o.z);
};
/** Lugares de trabalho na frente de cada móvel (planta). */
export const pontoArquivo = (L: Layout) => pontoLocal(L.estacoes.arquivo, 0, ESTACOES.arquivo.frente);
export const pontoQuadro = (L: Layout) => pontoLocal(L.estacoes.quadro, 0, ESTACOES.quadro.frente);
export const pontoCafe = (L: Layout) => pontoLocal(L.estacoes.cafe, 0, ESTACOES.cafe.frente);
/** Lugar de cada pesquisador diante da prateleira das lojas (vários vão juntos). */
export const lugarNasLojas = (L: Layout, i: number) =>
  pontoLocal(L.estacoes.lojas, 1.1 - (i % 5) * 1.05, ESTACOES.lojas.frente + Math.floor(i / 5) * 0.95);
/** Quadro na parede: giro 0 = parede do fundo; giro 1 = parede esquerda. */
export const quadroNaParede = (x: number, z: number): Estacao => (x < -10 ? { x: -10.27, z, rot: 1 } : { x, z: -4.27, rot: 0 });

// ---------------------------------------------------------------------------
// Mesas de trabalho (cada funcionário tem a sua; podem ser movidas, giradas e melhoradas)
// ---------------------------------------------------------------------------
export type ModeloMesa = "simples" | "moderna" | "vidro" | "baia" | "executiva" | "gamer";
export const MODELOS_MESA: Record<ModeloMesa, { nome: string; preco: number; descricao: string }> = {
  simples: { nome: "Simples", preco: 0, descricao: "madeira, 1 monitor" },
  moderna: { nome: "Moderna", preco: 300, descricao: "branca, monitor largo e luz de LED" },
  baia: { nome: "Baia", preco: 450, descricao: "com divisórias, mais privacidade" },
  vidro: { nome: "Vidro", preco: 350, descricao: "tampo de vidro, pés de metal e notebook" },
  executiva: { nome: "Executiva", preco: 600, descricao: "madeira escura, 2 monitores e gaveteiro" },
  gamer: { nome: "Gamer", preco: 700, descricao: "preta, 2 monitores curvos, luz colorida e cadeira gamer" },
};
/** Centro do tampo (mundo), giro e modelo. A pessoa fica 0,6 atrás do centro (lado -z local). */
export type Mesa = { x: number; z: number; rot: number; modelo: ModeloMesa };

/** Onde a pessoa fica na mesa (planta). */
export const assentoDe = (m: Mesa): Pos => {
  const o = rotacionar(0, -0.6, m.rot);
  return praPlanta(m.x + o.x, m.z + o.z);
};
/** Ponto ao lado da mesa por onde se chega a ela (planta). */
export const acessoDe = (m: Mesa): Pos => {
  const o = rotacionar(-1.75, -0.6, m.rot);
  return praPlanta(m.x + o.x, m.z + o.z);
};
/** Para onde a pessoa olha sentada: para o tampo. */
export const anguloAssento = (m: Mesa) => {
  const d = rotacionar(0, 1, m.rot);
  return Math.atan2(d.x, d.z);
};
/** Área ocupada pela mesa e pela cadeira (para não sobrepor nada). */
export const pegadaMesa = (m: Mesa): Retangulo => retLocal(m.x, m.z, m.rot, -1.32, -1.5, 1.32, 0.62);
/** Obstáculos para quem anda: o tampo e a cadeira (o lugar da pessoa fica livre). */
const obstaculosMesa = (m: Mesa): Retangulo[] => [
  retLocal(m.x, m.z, m.rot, -1.3, -0.5, 1.3, m.modelo === "baia" ? 0.6 : 0.5),
  retLocal(m.x, m.z, m.rot, -0.32, -1.45, 0.32, -0.85),
];

// ---------------------------------------------------------------------------
// Equipe e sala
// ---------------------------------------------------------------------------
export type Agente = {
  chave: Id;
  papel: Papel;
  nome: string;
  cabelo: string;
  detalhe: "bone" | "oculos" | "gravata";
  corPadrao: string;
};

const CORES_PESQUISADOR = ["#0f46e6", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04", "#0891b2", "#9333ea", "#e11d48", "#4f46e5"];
const CABELOS = ["#2b1b12", "#7a3b12", "#111827", "#a16207", "#4b5563", "#9a3412"];
const COLUNAS = [190, 400, 610];

/** `direita` = x da parede aberta da direita (no mundo); cresce com a ampliação lateral. */
export type Layout = {
  agentes: Agente[];
  mesas: Record<Id, Mesa>;
  estacoes: Record<EstacaoId, Estacao>;
  fundo: number;
  direita: number;
  assinatura: string;
};

/** Mesa padrão de quem ocupa a fileira f, coluna c (como era a sala original). */
function mesaPadrao(f: number, c: number): Mesa {
  const s = mundo({ x: COLUNAS[c], y: 388 + f * 112 });
  return { x: s.x, z: s.z + 0.6, rot: 0, modelo: "simples" };
}

/**
 * Monta a sala para a equipe. Mesas sem posição salva ficam no lugar padrão:
 * 1ª fileira = 1º pesquisador, analista e comprador; contratados nas fileiras seguintes, 3 por fileira.
 */
/** Ampliações da sala (vendidas na loja): cada nível aumenta a profundidade em 2,5 m. */
export const AMPLIACOES = [
  { nivel: 1, preco: 300 },
  { nivel: 2, preco: 500 },
  { nivel: 3, preco: 800 },
  { nivel: 4, preco: 1200 },
];
export const METROS_POR_AMPLIACAO = 2.5;

export function montarLayout(
  equipe: { chave: Id; papel: Papel; nome: string }[],
  salvas: Record<Id, Mesa> = {},
  ampliacao = 0,
  lateral = 0,
  estacoesSalvas: Partial<Record<EstacaoId, Estacao>> = {},
): Layout {
  const pesquisadores = equipe.filter((e) => e.papel === "pesquisador");
  const analista = equipe.find((e) => e.papel === "analista") ?? { chave: "analista", papel: "analista" as const, nome: "Analista" };
  const comprador = equipe.find((e) => e.papel === "comprador") ?? { chave: "comprador", papel: "comprador" as const, nome: "Comprador" };
  if (!pesquisadores.length) pesquisadores.push({ chave: "pesquisador", papel: "pesquisador", nome: "Pesquisador" });

  const agentes: Agente[] = [];
  const padrao: Record<Id, Mesa> = {};
  pesquisadores.forEach((p, i) => {
    agentes.push({ ...p, papel: "pesquisador", cabelo: CABELOS[i % CABELOS.length], detalhe: "bone", corPadrao: CORES_PESQUISADOR[i % CORES_PESQUISADOR.length] });
    padrao[p.chave] = i === 0 ? mesaPadrao(0, 0) : mesaPadrao(1 + Math.floor((i - 1) / 3), (i - 1) % 3);
  });
  agentes.push({ ...analista, papel: "analista", cabelo: "#7a3b12", detalhe: "oculos", corPadrao: "#0e9aa7" });
  padrao[analista.chave] = mesaPadrao(0, 1);
  agentes.push({ ...comprador, papel: "comprador", cabelo: "#111827", detalhe: "gravata", corPadrao: "#1e293b" });
  padrao[comprador.chave] = mesaPadrao(0, 2);

  const mesas: Record<Id, Mesa> = {};
  for (const a of agentes) mesas[a.chave] = salvas[a.chave] ? { ...salvas[a.chave] } : padrao[a.chave];

  // a sala cresce com o número de fileiras padrão (capacidade) e com as ampliações compradas
  const frentePadrao = Math.max(...Object.values(padrao).map((m) => pegadaMesa(m).z2));
  const zFrente = Math.max(6.3, frentePadrao + 1.2) + ampliacao * METROS_POR_AMPLIACAO;
  return {
    agentes,
    mesas,
    estacoes: Object.fromEntries(ESTACAO_IDS.map((id) => [id, { ...(estacoesSalvas[id] ?? ESTACOES[id].padrao) }])) as Record<EstacaoId, Estacao>,
    fundo: Math.ceil(praPlanta(0, zFrente).y),
    direita: 10.3 + lateral * METROS_POR_AMPLIACAO,
    assinatura: agentes.map((a) => a.chave).join(","),
  };
}

export const inicialDe = (layout: Layout): Record<Id, Vis> =>
  Object.fromEntries(layout.agentes.map((a) => [a.chave, { ...assentoDe(layout.mesas[a.chave]), andando: false, dur: 0 }]));

export const frenteDaSala = (layout: Layout) => mundo({ x: 0, y: layout.fundo }).z;

/** Onde quem entrega os preços para perto do analista (no acesso à mesa dele). */
export const ladoDoAnalista = (layout: Layout): Pos => {
  const a = layout.agentes.find((x) => x.papel === "analista");
  return a ? acessoDe(layout.mesas[a.chave]) : { x: 332, y: 388 };
};

// ---------------------------------------------------------------------------
// Itens decorativos (com preço em moedas; a loja de moedas ainda não está ativa)
// ---------------------------------------------------------------------------
export type TipoItem =
  | "planta"
  | "luminaria"
  | "bebedouro"
  | "impressora"
  | "mesa_centro"
  | "divisoria"
  | "estante"
  | "sofa"
  | "mesa_reuniao"
  | "cabine"
  | "tapete"
  | "sala_reuniao"
  | "copa"
  | "sala_descanso"
  | "quadro";
/** Item decorativo: posição no mundo 3D (x, z) e giro em quartos de volta (0 a 3). */
/** `tam`: tamanho do cômodo (0 = pequeno, 1 = médio, 2 = grande); os outros itens ignoram. */
export type Item = { id: string; tipo: TipoItem; x: number; z: number; rot: number; tam?: number };

/** w = largura (x) e d = profundidade (z) sem giro; `chao` = não bloqueia a passagem; `parede` = vai na parede. */
export const CATALOGO_ITENS: Record<TipoItem, { nome: string; artigo: "a" | "o"; preco: number; w: number; d: number; chao?: boolean; parede?: boolean; comodo?: boolean }> = {
  planta: { nome: "Planta", artigo: "a", preco: 40, w: 0.9, d: 0.9 },
  luminaria: { nome: "Luminária", artigo: "a", preco: 60, w: 0.6, d: 0.6 },
  bebedouro: { nome: "Bebedouro", artigo: "o", preco: 90, w: 0.6, d: 0.6 },
  impressora: { nome: "Impressora", artigo: "a", preco: 120, w: 1.0, d: 0.8 },
  mesa_centro: { nome: "Mesa de centro", artigo: "a", preco: 70, w: 1.0, d: 1.0 },
  divisoria: { nome: "Divisória", artigo: "a", preco: 60, w: 2.0, d: 0.2 },
  estante: { nome: "Estante", artigo: "a", preco: 150, w: 1.7, d: 0.5 },
  sofa: { nome: "Sofá", artigo: "o", preco: 200, w: 2.5, d: 1.0 },
  mesa_reuniao: { nome: "Mesa de reunião", artigo: "a", preco: 400, w: 3.2, d: 2.2 },
  cabine: { nome: "Cabine acústica", artigo: "a", preco: 500, w: 1.5, d: 1.5 },
  tapete: { nome: "Tapete", artigo: "o", preco: 80, w: 4.0, d: 1.7, chao: true },
  // cômodos completos: paredes com porta (lado +z local) e móveis dentro
  sala_reuniao: { nome: "Sala de reunião", artigo: "a", preco: 1500, w: 5.0, d: 3.6, comodo: true },
  copa: { nome: "Copa", artigo: "a", preco: 1200, w: 4.0, d: 3.0, comodo: true },
  sala_descanso: { nome: "Sala de descanso", artigo: "a", preco: 900, w: 4.0, d: 3.0, comodo: true },
  quadro: { nome: "Quadro de arte", artigo: "o", preco: 50, w: 1.6, d: 0.1, parede: true },
};
export const MAX_ITENS = 30;

export const TAMANHOS_COMODO = [
  { nome: "Pequeno", mais: [0, 0] },
  { nome: "Médio", mais: [1.5, 1.0] },
  { nome: "Grande", mais: [3.0, 2.0] },
];
/** Largura e profundidade do item (cômodos crescem com o tamanho escolhido). */
export function dimensoes(it: Item): { w: number; d: number } {
  const t = CATALOGO_ITENS[it.tipo];
  if (!t.comodo) return { w: t.w, d: t.d };
  const [mw, md] = TAMANHOS_COMODO[Math.max(0, Math.min(2, it.tam ?? 0))].mais;
  return { w: t.w + mw, d: t.d + md };
}
/** Preço do item: cômodos maiores custam mais. */
export function precoItem(tipo: TipoItem, tam = 0) {
  const base = CATALOGO_ITENS[tipo].preco;
  return CATALOGO_ITENS[tipo].comodo ? Math.round((base * (1 + 0.6 * tam)) / 10) * 10 : base;
}

/** Retângulo que o item ocupa no chão (o giro de 90°/270° troca largura e profundidade). */
export function pegada(it: Item): Retangulo {
  const t = dimensoes(it);
  const deitado = it.rot % 2 === 1;
  const w = (deitado ? t.d : t.w) / 2;
  const d = (deitado ? t.w : t.d) / 2;
  return ret(it.x - w, it.z - d, it.x + w, it.z + d);
}

/** Paredes de um cômodo (com o vão da porta no lado +z local), já giradas para o mundo. */
export function paredesComodo(it: Item): Retangulo[] {
  const t = dimensoes(it);
  const w = t.w / 2;
  const d = t.d / 2;
  const e = 0.12; // espessura
  const vao = 0.65; // metade da porta
  return [
    retLocal(it.x, it.z, it.rot, -w, -d, w, -d + e), // fundo
    retLocal(it.x, it.z, it.rot, -w, -d, -w + e, d), // esquerda
    retLocal(it.x, it.z, it.rot, w - e, -d, w, d), // direita
    retLocal(it.x, it.z, it.rot, -w, d - e, -vao, d), // frente, antes da porta
    retLocal(it.x, it.z, it.rot, vao, d - e, w, d), // frente, depois da porta
  ];
}
/** Ponto logo fora da porta do cômodo (planta): precisa continuar acessível. */
export function portaDoComodo(it: Item): Pos {
  const o = rotacionar(0, dimensoes(it).d / 2 + 0.45, it.rot);
  return praPlanta(it.x + o.x, it.z + o.z);
}

// ---------------------------------------------------------------------------
// Customização salva (plano pago)
// ---------------------------------------------------------------------------
export type Config = {
  parede: string;
  piso: [string, string];
  madeira: string;
  destaque: string;
  itens: Item[];
  /** posição, giro e modelo da mesa de cada funcionário (só as que saíram do padrão) */
  mesas: Record<Id, Mesa>;
  /** cor da camisa de cada funcionário (chave = id do funcionário) */
  uniformes: Record<string, string>;
  /** níveis de ampliação da sala comprados (0 a 4) */
  ampliacao: number;
  /** níveis de ampliação para a direita (0 a 4) */
  ampliacaoLateral: number;
  /** posição dos móveis de trabalho que saíram do lugar padrão */
  estacoes: Partial<Record<EstacaoId, Estacao>>;
};

export const CONFIG_PADRAO: Config = {
  parede: "#24304f",
  piso: ["#eef2fd", "#e1e7f8"],
  madeira: "#b08d62",
  destaque: "#0f46e6",
  itens: [{ id: "planta-1", tipo: "planta", x: 8.9, z: 2.6, rot: 0 }],
  mesas: {},
  uniformes: {},
  ampliacao: 0,
  ampliacaoLateral: 0,
  estacoes: {},
};

const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f-]{36}$/i;
const cor = (v: unknown, padrao: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : padrao);
const num = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) ? Number(v) : 0));

/** Itens no formato antigo (contador de plantas + liga/desliga) viram itens posicionados. */
function itensAntigos(c: Record<string, unknown>): Item[] {
  const itens: Item[] = [];
  const lugares = [[8.9, 2.6], [-9.6, 3.7], [9.6, 5.6], [9.7, -1.3]];
  const plantas = Math.max(0, Math.min(4, Math.round(Number(c.plantas ?? 1)) || 0));
  for (let i = 0; i < plantas; i++) itens.push({ id: `planta-${i + 1}`, tipo: "planta", x: lugares[i][0], z: lugares[i][1], rot: 0 });
  if (c.sofa === true) itens.push({ id: "sofa-1", tipo: "sofa", x: 8.4, z: 4.6, rot: 3 });
  if (c.quadro === true) itens.push({ id: "quadro-1", tipo: "quadro", x: -10.27, z: 0.1, rot: 0 });
  if (c.tapete === true) itens.push({ id: "tapete-1", tipo: "tapete", x: 0.3, z: 2.9, rot: 0 });
  return itens;
}

/** Aceita qualquer coisa vinda do banco ou do navegador e devolve uma configuração bem formada. */
export function normalizarConfig(bruto: unknown): Config {
  const c = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const piso = Array.isArray(c.piso) ? c.piso : [];
  const uniformes: Record<string, string> = {};
  if (c.uniformes && typeof c.uniformes === "object") {
    for (const [k, v] of Object.entries(c.uniformes as Record<string, unknown>).slice(0, 20)) {
      if (UUID.test(k) && typeof v === "string" && HEX.test(v)) uniformes[k] = v.toLowerCase();
    }
  }
  const mesas: Record<Id, Mesa> = {};
  if (c.mesas && typeof c.mesas === "object") {
    for (const [k, v] of Object.entries(c.mesas as Record<string, unknown>).slice(0, 20)) {
      const m = (v ?? {}) as Record<string, unknown>;
      const modelo = String(m.modelo) as ModeloMesa;
      if (!UUID.test(k)) continue;
      mesas[k] = { x: num(m.x, -9, 30), z: num(m.z, -3, 40), rot: Math.round(num(m.rot, 0, 3)), modelo: modelo in MODELOS_MESA ? modelo : "simples" };
    }
  }
  const estacoes: Partial<Record<EstacaoId, Estacao>> = {};
  if (c.estacoes && typeof c.estacoes === "object") {
    for (const id of ESTACAO_IDS) {
      const e = (c.estacoes as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
      if (!e || typeof e !== "object") continue;
      const x = num(e.x, -10.4, 40);
      const z = num(e.z, -4.5, 50);
      estacoes[id] = ESTACOES[id].parede ? quadroNaParede(x, z) : { x, z, rot: Math.round(num(e.rot, 0, 3)) };
    }
  }
  let itens: Item[];
  if (Array.isArray(c.itens)) {
    const ids = new Set<string>();
    itens = [];
    for (const b of c.itens.slice(0, MAX_ITENS)) {
      const i = (b ?? {}) as Record<string, unknown>;
      const tipo = String(i.tipo) as TipoItem;
      const id = String(i.id ?? "").replace(/[^a-z0-9_-]/gi, "").slice(0, 32);
      if (!(tipo in CATALOGO_ITENS) || !id || ids.has(id)) continue;
      ids.add(id);
      const novo: Item = { id, tipo, x: num(i.x, -10.4, 40), z: num(i.z, -4.5, 50), rot: Math.round(num(i.rot, 0, 3)) };
      if (CATALOGO_ITENS[tipo].comodo) novo.tam = Math.round(num(i.tam, 0, 2));
      itens.push(novo);
    }
  } else if (Object.keys(c).length) {
    itens = itensAntigos(c);
  } else {
    itens = CONFIG_PADRAO.itens.map((i) => ({ ...i }));
  }
  return {
    parede: cor(c.parede, CONFIG_PADRAO.parede),
    piso: [cor(piso[0], CONFIG_PADRAO.piso[0]), cor(piso[1], CONFIG_PADRAO.piso[1])],
    madeira: cor(c.madeira, CONFIG_PADRAO.madeira),
    destaque: cor(c.destaque, CONFIG_PADRAO.destaque),
    itens,
    mesas,
    uniformes,
    ampliacao: Math.round(num(c.ampliacao, 0, AMPLIACOES.length)),
    ampliacaoLateral: Math.round(num(c.ampliacaoLateral, 0, AMPLIACOES.length)),
    estacoes,
  };
}

// ---------------------------------------------------------------------------
// Navegação: grade da sala, caminhos e verificação da arrumação
// ---------------------------------------------------------------------------
const CEL = 20; // tamanho da célula na planta (= 0,5 no mundo)
const Y0 = 60; // fundo da sala (parede) na planta
const FOLGA = 0.22; // folga em volta dos obstáculos (largura do corpo)

export type Cenario = { layout: Layout; itens: Item[] };

/** Retângulo de um objeto de parede (quadros): fino, encostado na parede esquerda ou na do fundo. */
const pegadaNaParede = (x: number, z: number, w: number): Retangulo =>
  x < -10 ? ret(-10.4, z - w / 2, -10.2, z + w / 2) : ret(x - w / 2, -4.4, x + w / 2, -4.2);

/** Tudo que ocupa lugar na sala, com um id estável ("mesa:<chave>", "estacao:<id>" ou o id do item). */
type Objeto = {
  id: string;
  /** com artigo, minúsculo: "a mesa de Ana", "o sofá" */
  nome: string;
  /** começo de frase: "A mesa de Ana", "Sofá" */
  rotulo: string;
  r: Retangulo;
  obstaculos: Retangulo[];
  chao?: boolean;
  parede?: boolean;
  comodo?: Item;
};

function objetosDe(c: Cenario): Objeto[] {
  const lista: Objeto[] = [];
  for (const a of c.layout.agentes) {
    const m = c.layout.mesas[a.chave];
    lista.push({ id: `mesa:${a.chave}`, nome: `a mesa de ${a.nome}`, rotulo: `A mesa de ${a.nome}`, r: pegadaMesa(m), obstaculos: obstaculosMesa(m) });
  }
  for (const id of ESTACAO_IDS) {
    const t = ESTACOES[id];
    const e = c.layout.estacoes[id];
    const r = t.parede ? pegadaNaParede(e.x, e.z, t.w) : pegadaEstacao(id, e);
    lista.push({ id: `estacao:${id}`, nome: `${t.artigo} ${t.nome.toLowerCase()}`, rotulo: t.nome, r, obstaculos: t.parede ? [] : [r], parede: t.parede });
  }
  for (const it of c.itens) {
    const t = CATALOGO_ITENS[it.tipo];
    const r = t.parede ? pegadaNaParede(it.x, it.z, t.w) : pegada(it);
    lista.push({
      id: it.id,
      nome: `${t.artigo} ${t.nome.toLowerCase()}`,
      rotulo: t.nome,
      r,
      obstaculos: t.comodo ? paredesComodo(it) : t.chao || t.parede ? [] : [r],
      chao: t.chao,
      parede: t.parede,
      comodo: t.comodo ? it : undefined,
    });
  }
  return lista;
}

/** Contornos de tudo que ocupa o chão (para desenhar as "hitboxes" no modo de edição). */
export function contornos(c: Cenario): { id: string; r: Retangulo }[] {
  return objetosDe(c)
    .filter((o) => !o.parede)
    .map((o) => ({ id: o.id, r: o.r }));
}

/** Grade de navegação. `ignorar` tira um objeto (para saber se é ele que fecha a passagem). */
export function criarNav({ layout, itens }: Cenario, ignorar?: string) {
  const frente = frenteDaSala(layout);
  const anexos = itens.filter((i) => CATALOGO_ITENS[i.tipo].comodo).map(pegada);
  const xMax = Math.max(layout.direita, ...anexos.map((r) => r.x2));
  const zMax = Math.max(frente, ...anexos.map((r) => r.z2));
  const cols = Math.ceil(praPlanta(xMax, 0).x / CEL);
  const linhas = Math.ceil((praPlanta(0, zMax).y - Y0) / CEL);
  const obst = objetosDe({ layout, itens })
    .filter((o) => o.id !== ignorar)
    .flatMap((o) => o.obstaculos);
  const grossos = obst.map((r) => ret(r.x1 - FOLGA, r.z1 - FOLGA, r.x2 + FOLGA, r.z2 + FOLGA));

  const livre = new Uint8Array(cols * linhas);
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < cols; c++) {
      const { x, z } = mundo({ x: c * CEL + CEL / 2, y: Y0 + l * CEL + CEL / 2 });
      const naSala =
        (x > -10.05 && x < layout.direita - 0.25 && z > -4.1 && z < frente - 0.1) || anexos.some((r) => dentro(r, x, z));
      livre[l * cols + c] = naSala && !grossos.some((r) => dentro(r, x, z)) ? 1 : 0;
    }
  }
  const celula = (p: Pos) => ({ c: Math.floor(p.x / CEL), l: Math.floor((p.y - Y0) / CEL) });
  const ok = (c: number, l: number) => c >= 0 && l >= 0 && c < cols && l < linhas && livre[l * cols + c] === 1;
  const centro = (c: number, l: number): Pos => ({ x: c * CEL + CEL / 2, y: Y0 + l * CEL + CEL / 2 });

  /** Célula livre mais próxima de um ponto (até 3 células de distância). */
  function maisProxima(p: Pos) {
    const { c, l } = celula(p);
    if (ok(c, l)) return { c, l };
    for (let r = 1; r <= 3; r++) {
      let melhor: { c: number; l: number; d: number } | null = null;
      for (let dl = -r; dl <= r; dl++)
        for (let dc = -r; dc <= r; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dl)) !== r || !ok(c + dc, l + dl)) continue;
          const q = centro(c + dc, l + dl);
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (!melhor || d < melhor.d) melhor = { c: c + dc, l: l + dl, d };
        }
      if (melhor) return melhor;
    }
    return null;
  }

  /** Linha reta entre dois pontos sem atravessar nada? */
  function visivel(a: Pos, b: Pos) {
    const passos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
    for (let i = 1; i < passos; i++) {
      const q = { x: a.x + ((b.x - a.x) * i) / passos, y: a.y + ((b.y - a.y) * i) / passos };
      const { c, l } = celula(q);
      if (!ok(c, l)) return false;
    }
    return true;
  }

  /** Caminho (pontos da planta) de um lugar a outro, desviando dos obstáculos. */
  function caminho(de: Pos, para: Pos): Pos[] | null {
    const a = maisProxima(de);
    const b = maisProxima(para);
    if (!a || !b) return null;
    const chave = (c: number, l: number) => l * cols + c;
    const g = new Map<number, number>([[chave(a.c, a.l), 0]]);
    const veio = new Map<number, number>();
    const aberto: [number, number, number][] = [[0, a.c, a.l]]; // [f, c, l]
    const h = (c: number, l: number) => Math.hypot(c - b.c, l - b.l);
    const fechado = new Set<number>();
    let achou = false;
    while (aberto.length) {
      let i = 0;
      for (let k = 1; k < aberto.length; k++) if (aberto[k][0] < aberto[i][0]) i = k;
      const [, c, l] = aberto.splice(i, 1)[0];
      const k0 = chave(c, l);
      if (fechado.has(k0)) continue;
      fechado.add(k0);
      if (c === b.c && l === b.l) {
        achou = true;
        break;
      }
      for (let dl = -1; dl <= 1; dl++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dl) continue;
          const nc = c + dc;
          const nl = l + dl;
          if (!ok(nc, nl)) continue;
          if (dc && dl && (!ok(c + dc, l) || !ok(c, l + dl))) continue; // não corta quina
          const nk = chave(nc, nl);
          const ng = g.get(k0)! + (dc && dl ? Math.SQRT2 : 1);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            veio.set(nk, k0);
            aberto.push([ng + h(nc, nl), nc, nl]);
          }
        }
    }
    if (!achou) return null;
    const celulas: Pos[] = [];
    for (let k: number | undefined = chave(b.c, b.l); k !== undefined; k = veio.get(k)) celulas.push(centro(k % cols, Math.floor(k / cols)));
    celulas.reverse();
    // encurta: pula pontos intermediários quando a linha reta está livre
    const pontos: Pos[] = [];
    let atual = de;
    let i = 0;
    while (i < celulas.length) {
      let j = celulas.length - 1;
      while (j > i && !visivel(atual, celulas[j])) j--;
      pontos.push(celulas[j]);
      atual = celulas[j];
      i = j + 1;
    }
    pontos.push(para);
    return pontos;
  }

  /** Células alcançáveis a partir de um ponto (busca em largura). */
  function alcance(de: Pos) {
    const vistos = new Uint8Array(cols * linhas);
    const ini = maisProxima(de);
    if (!ini) return vistos;
    const fila = [ini.l * cols + ini.c];
    vistos[fila[0]] = 1;
    while (fila.length) {
      const k = fila.pop()!;
      const c = k % cols;
      const l = Math.floor(k / cols);
      for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!ok(c + dc, l + dl)) continue;
        const nk = (l + dl) * cols + c + dc;
        if (!vistos[nk]) {
          vistos[nk] = 1;
          fila.push(nk);
        }
      }
    }
    return vistos;
  }

  /** O ponto dá para ser alcançado (a partir do mapa de alcance)? */
  function alcancado(mapa: Uint8Array, p: Pos) {
    const q = maisProxima(p);
    if (!q) return false;
    const cq = centro(q.c, q.l);
    return mapa[q.l * cols + q.c] === 1 && Math.hypot(cq.x - p.x, cq.y - p.y) < CEL * 2;
  }

  return { caminho, alcance, alcancado };
}
export type Nav = ReturnType<typeof criarNav>;

/** Lugares que precisam continuar alcançáveis a partir da porta (com o objeto "dono" de cada um). */
export function destinosObrigatorios(layout: Layout, itens: Item[] = []): { nome: string; pos: Pos; dono: string }[] {
  const n = Math.max(1, layout.agentes.filter((a) => a.papel === "pesquisador").length);
  const lista = [
    { nome: "as lojas", pos: lugarNasLojas(layout, 0), dono: "estacao:lojas" },
    { nome: "o arquivo", pos: pontoArquivo(layout), dono: "estacao:arquivo" },
    { nome: "o quadro de avisos", pos: pontoQuadro(layout), dono: "estacao:quadro" },
    { nome: "o café", pos: pontoCafe(layout), dono: "estacao:cafe" },
  ];
  for (let i = 1; i < Math.min(n, 5); i++) lista.push({ nome: "as lojas", pos: lugarNasLojas(layout, i), dono: "estacao:lojas" });
  for (const a of layout.agentes) lista.push({ nome: `a mesa de ${a.nome}`, pos: acessoDe(layout.mesas[a.chave]), dono: `mesa:${a.chave}` });
  for (const it of itens) {
    const t = CATALOGO_ITENS[it.tipo];
    if (t.comodo) lista.push({ nome: `a porta d${t.artigo} ${t.nome.toLowerCase()}`, pos: portaDoComodo(it), dono: it.id });
  }
  return lista;
}

/** "de" + artigo: "a mesa" → "da mesa", "o sofá" → "do sofá", "um móvel" → "de um móvel". */
const emCimaDe = (nome: string) => (nome.startsWith("a ") ? `da ${nome.slice(2)}` : nome.startsWith("o ") ? `do ${nome.slice(2)}` : `de ${nome}`);

/** Problema do próprio objeto no lugar onde está (fora da sala, em cima de algo, na porta...), ou null. */
function problemaDe(o: Objeto, todos: Objeto[], c: Cenario): string | null {
  const frente = frenteDaSala(c.layout);
  const direita = c.layout.direita;
  const r = o.r;
  if (o.parede) {
    if (r.x1 < -10.3) {
      // parede esquerda
      if (r.z1 < -4.0 || r.z2 > frente - 0.3) return `${o.rotulo} ficaria fora da parede.`;
      if (r.z2 > PORTA_Z - 0.9 && r.z1 < PORTA_Z + 0.9) return `${o.rotulo} ficaria em cima da porta.`;
    } else {
      if (r.x1 < -10 || r.x2 > direita - 0.3) return `${o.rotulo} ficaria fora da parede.`;
      const janelas: [number, number][] = [[-5.7, -3.1], [3.1, 5.4]];
      if (janelas.some(([a, b]) => r.x2 > a && r.x1 < b)) return `${o.rotulo} ficaria em cima de uma janela.`;
    }
    const bate = todos.find((x) => x.id !== o.id && x.parede && cruza(x.r, r));
    return bate ? `${o.rotulo} ficaria em cima ${emCimaDe(bate.nome)}.` : null;
  }
  const dentroDaSala = r.x1 >= -10.3 && r.x2 <= direita && r.z1 >= -4.3 && r.z2 <= frente;
  if (!dentroDaSala) {
    if (!o.comodo) return `${o.rotulo} ficaria fora da sala.`;
    // anexo: encostado na frente ou na direita (os lados abertos), com a porta dando para dentro
    const t = CATALOGO_ITENS[o.comodo.tipo];
    if (r.x1 < -10.3 || r.z1 < -4.3) return `${o.rotulo} só pode sair da sala pela frente ou pela direita.`;
    if (!(r.x1 <= direita + 0.01 && r.z1 <= frente + 0.01)) return `${o.rotulo} precisa ficar encostad${t.artigo} no escritório.`;
    const porta = mundo(portaDoComodo(o.comodo));
    if (porta.x > direita - 0.3 || porta.z > frente - 0.3) return `A porta d${t.artigo} ${t.nome.toLowerCase()} precisa dar para dentro do escritório. Gire o cômodo.`;
  }
  if (o.chao) return null; // tapete: pode ficar por baixo de tudo
  if (r.x1 < -8.3 && r.z2 > PORTA_Z - 1.0 && r.z1 < PORTA_Z + 1.0) return `${o.rotulo} ficaria na frente da porta.`;
  const bate = todos.find((x) => x.id !== o.id && !x.chao && !x.parede && cruza(x.r, r));
  if (bate) return `${o.rotulo} ficaria em cima ${emCimaDe(bate.nome)}.`;
  if (o.comodo) {
    // um cômodo não pode engolir um lugar de trabalho de outro objeto (por dentro ainda seria alcançável pela porta)
    const engolido = destinosObrigatorios(c.layout).find((d) => {
      const w = mundo(d.pos);
      return w.x > r.x1 - 0.3 && w.x < r.x2 + 0.3 && w.z > r.z1 - 0.3 && w.z < r.z2 + 0.3;
    });
    if (engolido) return `${o.rotulo} cobriria ${engolido.nome}.`;
  }
  return null;
}

type Resultado = { ok: true } | { ok: false; motivo: string };

/**
 * A arrumação inteira é válida? Nada fora do lugar, nada sobreposto e todos os lugares de
 * trabalho alcançáveis a partir da porta. É a regra do "Salvar".
 */
export function verificar(c: Cenario): Resultado {
  const objs = objetosDe(c);
  for (const o of objs) {
    const p = problemaDe(o, objs, c);
    if (p) return { ok: false, motivo: p };
  }
  const nav = criarNav(c);
  const mapa = nav.alcance(PORTA);
  for (const d of destinosObrigatorios(c.layout, c.itens)) {
    if (!nav.alcancado(mapa, d.pos)) return { ok: false, motivo: `Assim ninguém conseguiria chegar até ${d.nome}.` };
  }
  return { ok: true };
}

/**
 * Este objeto, onde está, causa algum problema? (verde/vermelho do modo de edição)
 * Só culpa o objeto pelo que é dele: o próprio lugar, ou fechar uma passagem que estaria livre sem ele.
 */
export function verificarAlvo(c: Cenario, alvoId: string): Resultado {
  const objs = objetosDe(c);
  const o = objs.find((x) => x.id === alvoId);
  if (!o) return { ok: true };
  const p = problemaDe(o, objs, c);
  if (p) return { ok: false, motivo: p };
  const destinos = destinosObrigatorios(c.layout, c.itens);
  const com = criarNav(c);
  const mapaCom = com.alcance(PORTA);
  // os lugares do próprio objeto precisam ser alcançáveis
  const meu = destinos.find((d) => d.dono === alvoId && !com.alcancado(mapaCom, d.pos));
  if (meu) return { ok: false, motivo: `Ali ninguém conseguiria chegar até ${meu.nome}.` };
  if (o.parede || o.chao) return { ok: true };
  // e ele não pode fechar a passagem até os lugares dos outros
  const sem = criarNav(c, alvoId);
  const mapaSem = sem.alcance(PORTA);
  const fechado = destinos.find((d) => d.dono !== alvoId && !com.alcancado(mapaCom, d.pos) && sem.alcancado(mapaSem, d.pos));
  if (fechado) return { ok: false, motivo: `${o.rotulo} fecharia a passagem até ${fechado.nome}.` };
  return { ok: true };
}

/** Leva um ponto do chão para a parede mais próxima (para quadros). */
export function naParede(x: number, z: number): { x: number; z: number } {
  return x < -6 && x - -10.3 < z - -4.3 ? { x: -10.27, z } : { x, z: -4.27 };
}
