"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import {
  cadeadoPadrao,
  descricoes,
  descricoesCadeados,
  descricoesLigacoes,
  externos,
  LADO_ROTULO,
  ligacoes,
  sistemas,
  subsistemas,
  type Lado,
  type Sistema,
} from "@/lib/sistema";
import css from "./sistema.module.css";

// O quadro tem 1500 x 1100 px fixos (igual ao CSS): em telas menores o mapa rola para os lados.
const QUADRO_W = 1500;
const QUADRO_H = 1420;
const REF_H = 1300; // as posições (%) dos sistemas valem para 1300 px de altura; o resto do quadro é espaço extra embaixo
const DIVISA_Y = 650; // altura da linha tracejada (igual ao CSS)
const R_SISTEMA = 95; // raio do balão de um sistema
const R_SUB = 58; // raio padrão do balão de um sub-sistema

const px = (unidades: number) => `${unidades}px`;
const porId = (id: string) => sistemas.find((s) => s.id === id)!;
const centro = (s: Sistema) => ({
  x: (s.x / 100) * QUADRO_W,
  y: (s.y / 100) * REF_H,
});

// Um ícone de linha por sistema (24x24), desenhado na cor do sistema.
const ICONES: Record<string, ReactNode> = {
  site: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9z" />
    </>
  ),
  ide: (
    <>
      <path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" />
      <path d="M12 6v13.5" />
    </>
  ),
  ambulatorial: <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />,
  paroquial: <path d="M10.5 3h3v5h5v3h-5v10h-3V11h-5V8h5z" />,
  loja: (
    <>
      <path d="M3.5 8L12 4l8.5 4v8L12 20l-8.5-4z" />
      <path d="M3.5 8L12 12l8.5-4M12 12v8" />
    </>
  ),
};

// Todos os balões num só cadastro (centro, raio e lado), para os traços acharem as pontas.
type No = { x: number; y: number; r: number; lado: Lado };
const nos = new Map<string, No>();
for (const s of sistemas)
  nos.set(s.id, { ...centro(s), r: R_SISTEMA, lado: s.lado });

// Posição de cada sub-sistema: em volta do sistema a que pertence, espalhados no arco escolhido.
const subs = sistemas.flatMap((pai) => {
  const filhos = subsistemas.filter((f) => f.pai === pai.id);
  const [a0, a1] = pai.arco ?? [0, 360 - 360 / Math.max(filhos.length, 1)];
  const c = centro(pai);
  return filhos.map((f, i) => {
    const r = f.r ?? R_SUB;
    const orbita = pai.orbita ?? R_SISTEMA + r + 26;
    const graus =
      f.angulo ??
      (filhos.length === 1
        ? (a0 + a1) / 2
        : a0 + (i * (a1 - a0)) / (filhos.length - 1));
    const rad = (graus * Math.PI) / 180;
    const x = c.x + orbita * Math.cos(rad);
    const y = c.y + orbita * Math.sin(rad);
    nos.set(f.id, { x, y, r, lado: pai.lado });
    return { ...f, r, paiNome: pai.nome.join(" "), x, y, paiX: c.x, paiY: c.y };
  });
});

// Sistemas externos e projeções: ficam na internet, com posição própria.
const exts = externos.map((e) => {
  const x = (e.x / 100) * QUADRO_W;
  const y = (e.y / 100) * REF_H;
  nos.set(e.id, { x, y, r: e.r, lado: e.lado ?? "internet" });
  return { ...e, x, y };
});
// A cor de um balão externo vem do sistema de onde ele sai (subindo a cadeia até chegar a um sistema).
const corDe = (id: string): string => {
  const sis = sistemas.find((s) => s.id === id);
  if (sis) return sis.cor;
  const sb = subs.find((f) => f.id === id);
  if (sb) return porId(sb.pai).cor;
  return corDe(exts.find((e) => e.id === id)!.de);
};
const nomeDe = (id: string) =>
  (sistemas.find((s) => s.id === id) ??
    subs.find((f) => f.id === id) ??
    exts.find((e) => e.id === id))!.nome.join(" ");

// Os traços de cada balão externo/projeção: para o balão de onde sai e para os que ele também alcança.
const tracosExt = exts.flatMap((e) => [
  ...[e.de, ...(e.liga ?? [])].map((alvo) => ({
    id: `${e.id}>${alvo}`,
    de: e.id,
    para: alvo,
    projeto: !!e.projeto,
    cadeado: !!e.cadeado,
    curva: e.curvas?.[alvo],
  })),
  ...(e.ligaFuturo ?? []).map((alvo) => ({
    id: `${e.id}>${alvo}`,
    de: e.id,
    para: alvo,
    projeto: true,
    cadeado: false,
    curva: e.curvas?.[alvo],
  })),
]);
// Caminho de um traço: reta entre os centros, ou uma curva que se afasta `curva` px da reta (para contornar um balão no meio).
const caminho = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  curva?: number,
) => {
  if (!curva) return `M${a.x} ${a.y} L${b.x} ${b.y}`;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 + (-dy / len) * curva * -1;
  const cy = (a.y + b.y) / 2 + (dx / len) * curva;
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
};

// Traços extras dos sub-sistemas (ex.: uma projeção do site que também se liga a outro sistema).
const tracosSub = subs.flatMap((f) =>
  (f.liga ?? []).map((alvo) => ({
    id: `${f.id}>${alvo}`,
    de: f.id,
    para: alvo,
    projeto: !!f.projeto,
    cadeado: false,
    curva: undefined as number | undefined,
  })),
);

// Pontos de contato: quem, de dentro, recebe um traço que cruza a divisa. Cada um ganha UM cadeado na borda,
// virado para o lado de onde vêm os traços.
type Contato = {
  id: string;
  x: number;
  y: number;
  r: number;
  de: { x: number; y: number }[];
};
const contatos = new Map<string, Contato>();
// (projeções ainda não existem: não puxam o cadeado, salvo as marcadas com `cadeado`, como o Portal dos fornecedores)
const todosOsTracos = [
  ...ligacoes.map((l) => ({ de: l.de, para: l.para })),
  ...[...tracosExt, ...tracosSub]
    .filter((t) => !t.projeto || t.cadeado)
    .map((t) => ({ de: t.de, para: t.para })),
];
for (const t of todosOsTracos) {
  const a = nos.get(t.de)!;
  const b = nos.get(t.para)!;
  if (a.lado === b.lado) continue;
  const [idDentro, dentro, fora] =
    a.lado === "interno" ? [t.de, a, b] : [t.para, b, a];
  const c = contatos.get(idDentro) ?? {
    id: idDentro,
    x: dentro.x,
    y: dentro.y,
    r: dentro.r,
    de: [],
  };
  c.de.push({ x: fora.x, y: fora.y });
  contatos.set(idDentro, c);
}
const cadeados = [...contatos.values()].map((c) => {
  let vx = 0;
  let vy = 0;
  for (const o of c.de) {
    const d = Math.hypot(o.x - c.x, o.y - c.y) || 1;
    vx += (o.x - c.x) / d;
    vy += (o.y - c.y) / d;
  }
  const n = Math.hypot(vx, vy) || 1;
  return { id: c.id, x: c.x + (vx / n) * c.r, y: c.y + (vy / n) * c.r };
});
const comContato = new Set(contatos.keys());

// Todas as ligações do mapa, com o caminho de cada uma, para o mouse achar a ligação certa e explicá-la.
type Lig = {
  id: string;
  de: string;
  para: string;
  d: string;
  projeto: boolean;
};
const todasLigacoes: Lig[] = [
  ...subs.map((f) => ({
    id: `${f.pai}>${f.id}`,
    de: f.pai,
    para: f.id,
    d: `M${f.paiX} ${f.paiY} L${f.x} ${f.y}`,
    projeto: !!f.projeto,
  })),
  ...[...tracosExt, ...tracosSub].map((t) => ({
    id: t.id,
    de: t.de,
    para: t.para,
    d: caminho(nos.get(t.de)!, nos.get(t.para)!, t.curva),
    projeto: t.projeto,
  })),
  ...ligacoes.map((l) => ({
    id: `${l.de}>${l.para}`,
    de: l.de,
    para: l.para,
    d: caminho(nos.get(l.de)!, nos.get(l.para)!),
    projeto: false,
  })),
];

const paiDe = (id: string) =>
  subs.find((f) => f.id === id)?.pai ?? exts.find((e) => e.id === id)?.de;
const ehProjeto = (id: string) =>
  !!(
    subs.find((f) => f.id === id)?.projeto ??
    exts.find((e) => e.id === id)?.projeto
  );
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// "do Sistema paroquial", "da Segurança": o artigo certo para o nome
const comArtigo = (nome: string) =>
  `${/^(Sistema|Site|Portal|PDV|Formulário)/.test(nome) ? "do" : "da"} ${nome}`;

// O texto do balão de um círculo.
function infoDoNo(id: string) {
  const no = nos.get(id)!;
  const pai = paiDe(id);
  let etiqueta: string;
  if (sistemas.some((s) => s.id === id))
    etiqueta = `Sistema · ${LADO_ROTULO[no.lado]}`;
  else if (ehProjeto(id))
    etiqueta = `Projeto idealizado · ${LADO_ROTULO[no.lado]}`;
  else if (exts.some((e) => e.id === id) && no.lado === "internet")
    etiqueta = "Sistema externo · na internet";
  else if (
    pai &&
    !sistemas.some((s) => s.id === pai) &&
    !subs.some((f) => f.id === pai)
  )
    etiqueta = `Ligado a ${nomeDe(pai)} · ${LADO_ROTULO[no.lado]}`;
  else etiqueta = `Parte ${comArtigo(nomeDe(pai!))} · ${LADO_ROTULO[no.lado]}`;
  if (comContato.has(id)) etiqueta += " · ponto de contato com a internet";
  return {
    titulo: nomeDe(id),
    etiqueta: maiuscula(etiqueta),
    texto: descricoes[id] ?? "",
  };
}

// O texto do balão de uma ligação.
function infoDaLigacao(l: Lig) {
  const a = nos.get(l.de)!;
  const b = nos.get(l.para)!;
  const cruza = a.lado !== b.lado;
  const texto =
    descricoesLigacoes[`${l.de}>${l.para}`] ??
    descricoesLigacoes[`${l.para}>${l.de}`] ??
    (paiDe(l.para) === l.de
      ? `${nomeDe(l.para)} faz parte ${comArtigo(nomeDe(l.de))}.`
      : paiDe(l.de) === l.para
        ? `${nomeDe(l.de)} faz parte ${comArtigo(nomeDe(l.para))}.`
        : `${nomeDe(l.de)} se liga a ${nomeDe(l.para)}.`);
  const etiqueta = `${l.projeto ? "Ligação que ainda não existe" : "Ligação"}${cruza ? " · cruza a divisa entre a internet e a paróquia" : ""}`;
  return { titulo: `${nomeDe(l.de)} — ${nomeDe(l.para)}`, etiqueta, texto };
}

// O sistema a que um balão pertence (sobe pela cadeia até chegar a um sistema): serve para agrupar por cor e para destacar.
const raizDe = (id: string): string => {
  if (sistemas.some((s) => s.id === id)) return id;
  const sb = subs.find((f) => f.id === id);
  if (sb) return sb.pai;
  return raizDe(exts.find((e) => e.id === id)!.de);
};
const todosIds = [
  ...sistemas.map((s) => s.id),
  ...subs.map((f) => f.id),
  ...exts.map((e) => e.id),
];
const vizinhos = new Map<string, Set<string>>();
for (const l of todasLigacoes) {
  (vizinhos.get(l.de) ?? vizinhos.set(l.de, new Set()).get(l.de)!).add(l.para);
  (vizinhos.get(l.para) ?? vizinhos.set(l.para, new Set()).get(l.para)!).add(
    l.de,
  );
}
// As ligações reais que cruzam a divisa: nelas correm pontinhos (a troca de informação entre a internet e a paróquia).
const fluxos = todasLigacoes.filter(
  (l) => !l.projeto && nos.get(l.de)!.lado !== nos.get(l.para)!.lado,
);

// A ordem em que os balões abrem: começa pelo Sistema paroquial; cada sistema vem com o que é dele.
const ORDEM_SISTEMAS = ["paroquial", "ambulatorial", "site", "ide", "loja"];
const ordem: string[] = ORDEM_SISTEMAS.flatMap((s) => [s, ...todosIds.filter((id) => id !== s && raizDe(id) === s)]);
const posicao = new Map(ordem.map((id, i) => [id, i]));
const ehSistema = (id: string) => sistemas.some((s) => s.id === id);

// Uma "vista" do mapa: o ponto (qx, qy) do quadro aparece na posição (sx, sy) da tela, com o zoom z.
type Vista = { z: number; qx: number; qy: number; sx: number; sy: number };

type Dica = {
  titulo: string;
  etiqueta: string;
  texto: string;
  blocos?: { titulo: string; texto: string }[];
  x: number;
  y: number;
  abaixo: boolean;
};

// O texto do balão de um cadeado: para que serve ali e como está protegido.
function infoDoCadeado(id: string) {
  const t = descricoesCadeados[id] ?? cadeadoPadrao;
  return {
    titulo: `Cadeado · ${nomeDe(id)}`,
    etiqueta: "Ponto de contato com a internet",
    texto: "",
    blocos: [
      { titulo: "Para que serve aqui", texto: t.serve },
      { titulo: "Como está protegido", texto: t.protecao },
    ],
  };
}
const limitarX = (x: number) => Math.min(Math.max(x, 175), QUADRO_W - 175);

// Os sistemas, sub-sistemas, sistemas externos e projeções, soltos no quadro, e a divisa tracejada entre a internet (em cima) e a rede da paróquia (embaixo).
export default function Baloes() {
  const [dica, setDica] = useState<Dica | null>(null);
  const [ligacaoAtiva, setLigacaoAtiva] = useState<string | null>(null);
  const [noAtivo, setNoAtivo] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null); // sistema escolhido na legenda
  // o balão de explicação fica montado depois que o mouse sai, só para esmaecer aos poucos
  const [ultima, setUltima] = useState<Dica | null>(null);
  if (dica && dica !== ultima) setUltima(dica);
  const mostrada = dica ?? ultima;
  const quadroRef = useRef<HTMLDivElement>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const superficieRef = useRef<HTMLDivElement>(null);

  // Abertura: os balões aparecem um a um, e a página rola sozinha para mostrar cada um. `aberto` = quantos já apareceram.
  const [aberto, setAberto] = useState(0);
  const pulando = aberto >= ordem.length;
  const terminouSozinha = useRef(false);
  const eraPular = useRef(false);
  // Visão geral (celular): ao fim da abertura o mapa se afasta até caber na largura da tela. O botão amplia de volta.
  const [geral, setGeral] = useState(false);
  const mexeuNoZoom = useRef(false);
  // Destaque (celular, na visão geral): tocar num item o põe no centro, com zoom, e destaca os ligados a ele (`emFoco`).
  // Segundo toque nele: volta à visão geral, mas o destaque fica. Tocar num vizinho troca o item principal. Tocar fora desfaz tudo.
  const [destaque, setDestaque] = useState<string | null>(null);
  const [emFoco, setEmFoco] = useState(false);
  // espelhos em ref (os temporizadores e a fila leem o estado de agora, não o da renderização em que foram criados)
  const destaqueRef = useRef<string | null>(null);
  const emFocoRef = useRef(false);
  // o layout fixo do zoom (margens + escala da visão geral) e a vista em que o mapa está agora
  const baseRef = useRef<{ scrollL: number; scrollT: number; m: { ml: number; mr: number; mt: number; mb: number } } | null>(null);
  const vistaAtual = useRef<Vista | null>(null);
  const prepararBaseRef = useRef<(() => void) | null>(null);
  const [liberou, setLiberou] = useState(0); // sobe quando a visão geral termina de se formar: hora de aplicar o toque guardado
  const pendente = useRef<string | null>(null); // último toque que chegou com o mapa em movimento: roda quando ele parar
  const mudarDestaque = (v: string | null) => {
    destaqueRef.current = v;
    setDestaque(v);
  };
  const mudarEmFoco = (v: boolean) => {
    emFocoRef.current = v;
    setEmFoco(v);
  };
  const paramsGeral = useRef({ escala: 1, topo: 250, altura: 0 });
  const geralPronto = useRef(false);
  const ocupado = useRef(false);
  const destacadoAntesDoToque = useRef<string | null>(null);
  const alternarGeral = (ligar: boolean) => {
    mexeuNoZoom.current = true;
    setGeral(ligar);
  };
  useEffect(() => {
    if (!geral) geralPronto.current = false;
  }, [geral]);
  useEffect(() => {
    if (!pulando || !terminouSozinha.current || !window.matchMedia("(max-width: 700px)").matches) return;
    const t = setTimeout(() => alternarGeral(true), 1800);
    return () => clearTimeout(t);
  }, [pulando]);
  useEffect(() => {
    const sup = superficieRef.current;
    const rol = rolagemRef.current;
    const quadro = quadroRef.current;
    if (!mexeuNoZoom.current || !sup || !rol || !quadro || sup.offsetWidth === 0) return;
    // Ampliar de volta: sem animar o tamanho (pesado no celular). O mapa esmaece, volta ao normal de uma vez e reaparece.
    if (!geral) {
      let t2: ReturnType<typeof setTimeout> | undefined;
      sup.style.transition = "opacity 200ms ease";
      sup.style.opacity = "0";
      const t1 = setTimeout(() => {
        sup.style.transition = "none";
        rol.style.transition = "none";
        rol.style.overflow = "";
        rol.style.height = "";
        rol.style.paddingBottom = "";
        sup.style.transform = "";
        sup.style.zoom = "";
        sup.style.removeProperty("--topo");
        sup.style.removeProperty("--ml");
        sup.style.removeProperty("--mr");
        sup.style.removeProperty("--mb");
        sup.style.boxSizing = "";
        sup.style.paddingLeft = "";
        sup.style.paddingRight = "";
        sup.style.paddingBottom = "";
        rol.style.boxSizing = "";
        rol.style.touchAction = "";
        delete rol.dataset.foco;
        baseRef.current = null;
        vistaAtual.current = null;
        rol.style.scrollBehavior = "";
        rol.scrollLeft = 0;
        void sup.offsetHeight;
        sup.style.transition = "opacity 350ms ease";
        sup.style.opacity = "1";
        t2 = setTimeout(() => {
          sup.style.transition = "";
          sup.style.opacity = "";
          rol.style.transition = "";
        }, 400);
      }, 220);
      return () => {
        clearTimeout(t1);
        if (t2) clearTimeout(t2);
      };
    }
    // Visão geral: só a escala é animada (o compositor cuida, sem recalcular o layout a cada quadro).
    // O espaço de topo e a altura mudam de uma vez; uma translação inicial faz o mapa parecer ainda no lugar de antes.
    const DUR = 1800;
    const natural = sup.offsetHeight;
    const escala = Math.min(1, window.innerWidth / sup.offsetWidth);
    const topoNatural = 250;
    // na visão geral o céu cresce até caber o título inteiro (ele fica por cima do mapa)
    const cabecalho = rol.closest("main")?.querySelector("header");
    const topoGeral = Math.max(100, (cabecalho?.getBoundingClientRect().height ?? 0) + 14); // só o que o título ocupa, sem o piso de 250 px do mapa normal
    const topoNovo = topoGeral / escala;
    const encolhida = topoGeral + (natural - topoNatural) * escala;
    // a rolagem suave da abertura pode estar no meio do caminho: cancela e trava o mapa na esquerda
    rol.style.scrollBehavior = "auto";
    paramsGeral.current = { escala, topo: topoNovo, altura: encolhida };
    geralPronto.current = false;
    rol.scrollLeft = 0;
    rol.style.overflow = "hidden";
    rol.style.height = `${natural}px`;
    rol.style.paddingBottom = "0px";
    sup.style.transformOrigin = "0 0";
    sup.style.transition = "none";
    sup.style.setProperty("--topo", `${topoNovo}px`);
    sup.style.transform = `translateY(${topoNatural - topoNovo}px)`;
    void sup.offsetHeight;
    sup.style.willChange = "transform";
    sup.style.transition = `transform ${DUR}ms ease`;
    window.scrollTo({ top: Math.max(0, rol.getBoundingClientRect().top + window.scrollY - 8), behavior: "smooth" });
    const q = requestAnimationFrame(() => {
      rol.scrollLeft = 0;
      sup.style.transform = `scale(${escala})`;
    });
    const fim = setTimeout(() => {
      rol.scrollLeft = 0;
      rol.style.boxSizing = "content-box"; // a folga de baixo soma à altura (com border-box ela comia o fim do mapa)
      // terminado o movimento, troca a escala por `zoom`: o mapa passa a ter o tamanho real da tela (390 px, não 1500 encolhidos),
      // sem a camada gigante que o celular não consegue pintar por inteiro ao rolar (quadrados faltando e piscando)
      sup.style.transition = "none";
      sup.style.transform = "";
      sup.style.zoom = String(escala);
      sup.style.willChange = "";
      geralPronto.current = true;
      prepararBaseRef.current?.();
      setLiberou((n) => n + 1);
      rol.style.height = `${encolhida}px`;
      rol.style.paddingBottom = "150px"; // espaço sob o mapa para a legenda fixa não cobri-lo
    }, DUR + 60);
    return () => {
      cancelAnimationFrame(q);
      clearTimeout(fim);
    };
  }, [geral]);
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      const t = setTimeout(() => setAberto(ordem.length), 0);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    if (aberto >= ordem.length) return;
    // no celular o mapa aparece de perto, um balão por vez: mais devagar, para dar tempo de acompanhar
    const lento = window.matchMedia("(max-width: 700px)").matches ? 2.3 : 1;
    const t = setTimeout(() => {
      if (aberto + 1 >= ordem.length) terminouSozinha.current = true;
      setAberto(aberto + 1);
    }, (aberto === 0 ? 900 : ehSistema(ordem[aberto - 1]) ? 1000 : 430) * lento);
    return () => clearTimeout(t);
  }, [aberto]);
  // qualquer gesto da pessoa (rolar, tocar, digitar, clicar) encerra a abertura e mostra tudo
  useEffect(() => {
    const pular = () => setAberto(ordem.length);
    const eventos = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    eventos.forEach((e) => window.addEventListener(e, pular, { passive: true, once: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, pular));
  }, []);
  // enquanto a pessoa arrasta (rola a página ou o mapa), o fundo e os pontinhos ficam parados: nada se repinta durante o arraste
  useEffect(() => {
    let fim: ReturnType<typeof setTimeout> | undefined;
    const parar = () => {
      const rol = rolagemRef.current;
      if (!rol) return;
      rol.dataset.rolando = "1";
      clearTimeout(fim);
      fim = setTimeout(() => delete rol.dataset.rolando, 180);
    };
    window.addEventListener("scroll", parar, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", parar, { capture: true });
      clearTimeout(fim);
    };
  }, []);
  // a cada balão novo, rola suavemente até ele se estiver fora do meio da tela
  useEffect(() => {
    if (aberto < 1 || aberto > ordem.length) return;
    const n = nos.get(ordem[aberto - 1]);
    const quadro = quadroRef.current;
    const rolagem = rolagemRef.current;
    if (!n || !quadro || !rolagem) return;
    const r = quadro.getBoundingClientRect();
    if (r.width === 0) return; // mapa escondido (visão em lista no celular): não rola a página
    const sx = r.left + n.x;
    const sy = r.top + n.y;
    const margemY = Math.min(180, window.innerHeight / 4);
    if (sy < margemY || sy > window.innerHeight - margemY) window.scrollBy({ top: sy - window.innerHeight / 2, behavior: "smooth" });
    const margemX = Math.min(200, window.innerWidth / 4);
    if (sx < margemX || sx > window.innerWidth - margemX) rolagem.scrollBy({ left: sx - window.innerWidth / 2, behavior: "smooth" });
  }, [aberto]);
  const cabecalhoEl = () => rolagemRef.current?.closest("main")?.querySelector("header") as HTMLElement | null | undefined;
  const mostrarCabecalho = (mostrar: boolean) => {
    const cab = cabecalhoEl();
    if (!cab) return;
    cab.style.transition = "opacity 500ms ease";
    cab.style.opacity = mostrar ? "1" : "0";
  };
  // O item no centro da área livre da tela, com zoom para caber também tudo o que se liga a ele.
  // Zoom em que o item fica com tudo o que se liga a ele cabendo em volta dele.
  // ───── Zoom ─────
  // O mapa é sempre descrito por uma "vista": o ponto (qx, qy) do quadro aparece na posição (sx, sy) da tela, com o zoom z.
  // A visão geral é uma vista (o canto do quadro, sob o céu); o zoom num item é outra (o centro do item, no meio da área livre).
  // Animar de uma vista a outra é só passar por vistas no meio do caminho: o mesmo movimento para qualquer item.
  const areaUtil = () => {
    // embaixo fica a legenda (ou, com um item escolhido, o descritivo dele): reserva de altura fixa, a mesma sempre
    const reserva = 210;
    const topoUtil = 56;
    return { topoUtil, alturaUtil: Math.max(200, window.innerHeight - topoUtil - reserva - 24) };
  };
  const vistaGeral = (): Vista => {
    const { escala, topo } = paramsGeral.current;
    return { z: escala, qx: 0, qy: 0, sx: 0, sy: topo * escala };
  };
  const vistaDoItem = (id: string): Vista => {
    const c = nos.get(id)!;
    let meioW = c.r;
    let meioH = c.r;
    for (const v of vizinhos.get(id) ?? []) {
      const n = nos.get(v);
      if (!n) continue;
      meioW = Math.max(meioW, Math.abs(n.x - c.x) + n.r);
      meioH = Math.max(meioH, Math.abs(n.y - c.y) + n.r);
    }
    const PAD = 36;
    const { topoUtil, alturaUtil } = areaUtil();
    // O zoom ideal faz caber tudo o que se liga ao item. Mas há itens cujos ligados estão espalhados pelo mapa inteiro (Site, Portal IDE):
    // caber tudo daria quase a visão geral, com texto ilegível. Por isso há um piso de leitura: o item e o que está em volta dele ficam
    // legíveis, e o que está mais longe sai da tela (continua destacado).
    // O piso depende do tamanho da letra do item (sistema 21 px, sub-sistema 13,5, balões pequenos 11,5): o nome sempre fica com uns 11 px na tela.
    const fontePx = sistemas.some((s) => s.id === id) ? 21 : c.r > 66 ? 15.5 : c.r > 50 ? 13.5 : 11.5;
    const pisoLeitura = Math.min(1, Math.max(0.62, 11 / fontePx));
    const caber = Math.min(window.innerWidth / 2 / (meioW + PAD), alturaUtil / 2 / (meioH + PAD));
    const z = Math.min(1, Math.max(paramsGeral.current.escala, pisoLeitura, caber));
    return { z, qx: c.x, qy: c.y, sx: window.innerWidth / 2, sy: topoUtil + alturaUtil / 2 };
  };
  const vistaDaTela = (): Vista => vistaAtual.current ?? vistaGeral();
  // Margens (em unidades do quadro) que o mapa precisa ter em volta para que NENHUMA vista (a geral e a de cada item) mostre
  // área sem mapa. Com elas fixas, o zoom vira só uma transformação: nada é recalculado nem repintado durante o movimento.
  const margensBase = () => {
    const todas: Vista[] = [vistaGeral(), ...todosIds.map((id) => vistaDoItem(id))];
    const W = window.innerWidth;
    const H = window.innerHeight;
    let ml = 0;
    let mr = 0;
    let mt = 0;
    let mb = 0;
    for (const v of todas) {
      ml = Math.max(ml, v.sx / v.z - v.qx);
      mr = Math.max(mr, (W - v.sx) / v.z - (QUADRO_W - v.qx));
      mt = Math.max(mt, v.sy / v.z - v.qy);
      mb = Math.max(mb, (H - v.sy) / v.z - (QUADRO_H - v.qy));
    }
    const FOLGA = 120; // o caminho entre duas vistas pode passar um pouco além das duas pontas
    // embaixo, mais: a página pode estar rolada para baixo (até uns 150 px na tela) e a janela então mostra mais do fim do mapa
    return { ml: ml + FOLGA, mr: mr + FOLGA, mt: mt + FOLGA, mb: mb + FOLGA + 600 };
  };
  // Layout-base do zoom: o mapa inteiro, na escala da visão geral, com as margens que qualquer vista precisa. Fica assim do fim da
  // formação da visão geral até o "Ampliar": o zoom é só uma transformação, e nunca há troca de layout (a troca era o que piscava).
  const prepararBase = () => {
    const sup = superficieRef.current;
    const rol = rolagemRef.current;
    if (!sup || !rol) return;
    const { escala: s, topo, altura } = paramsGeral.current;
    const m = margensBase();
    const scrollL = m.ml * s;
    const scrollT = m.mt * s - topo * s;
    rol.style.boxSizing = "content-box";
    rol.style.overflow = "hidden";
    rol.style.height = `${altura}px`;
    rol.style.padding = "";
    rol.style.paddingBottom = "150px";
    rol.dataset.foco = "1";
    sup.style.boxSizing = "content-box";
    sup.style.paddingLeft = `${m.ml}px`;
    sup.style.paddingRight = `${m.mr}px`;
    sup.style.paddingBottom = `${m.mb}px`;
    sup.style.zoom = String(s);
    sup.style.setProperty("--topo", `${m.mt}px`);
    // as margens também vão para o CSS: o fundo (degradê e brilhos) é ancorado no quadro, não nas bordas do mapa com margens
    sup.style.setProperty("--ml", `${m.ml}px`);
    sup.style.setProperty("--mr", `${m.mr}px`);
    sup.style.setProperty("--mb", `${m.mb}px`);
    sup.style.transformOrigin = "0 0";
    sup.style.transform = "";
    rol.scrollLeft = scrollL;
    rol.scrollTop = scrollT;
    baseRef.current = { scrollL, scrollT, m };
    vistaAtual.current = vistaGeral();
  };
  useEffect(() => {
    prepararBaseRef.current = prepararBase;
  });
  // Na visão geral com um item destacado, o cartão descritivo (fixo embaixo) cobriria o fim do mapa: a página ganha folga embaixo e
  // rola até o fim, deixando o mapa inteiro à vista acima do cartão. Sem destaque, volta à folga normal.
  // Rola a página só o necessário para o fim do mapa ficar acima do que cobre o rodapé (a legenda ou o cartão); se já cabe, não rola
  const rolarParaVerTudo = () => {
    const quadro = quadroRef.current;
    if (!quadro) return;
    const fim = quadro.getBoundingClientRect(); // posições na janela (o mapa está na visão geral, sem transformação)
    if (fim.width === 0) return;
    const cobertor = (document.querySelector("aside[class*=folha]") ?? document.querySelector(`.${css.painelLegenda}`)) as HTMLElement | null;
    const topoDoCobertor = cobertor ? cobertor.getBoundingClientRect().top : window.innerHeight;
    const falta = fim.bottom + 14 - topoDoCobertor; // quanto do mapa está por baixo do cobertor
    const maximo = document.documentElement.scrollHeight - window.innerHeight;
    const alvo = Math.max(0, Math.min(maximo, window.scrollY + falta));
    if (Math.abs(alvo - window.scrollY) > 1) window.scrollTo({ top: alvo, behavior: "smooth" });
  };
  const ajustarFolgaDoCartao = (rolar: boolean) => {
    const rol = rolagemRef.current;
    if (!rol) return;
    const comCartao = destaqueRef.current !== null;
    rol.style.paddingBottom = comCartao ? "240px" : "150px";
    // a visão geral só cabe inteira acima da legenda (ou do cartão) com a página rolada até o fim: rola sozinha
    if (rolar) rolarParaVerTudo();
  };
  // Leva o mapa da vista de agora até `destino` ("geral" ou o id de um item). O mapa é pintado uma vez, na escala da visão geral;
  // o zoom é uma transformação feita pela placa de vídeo, e o navegador repinta nítido o que fica à vista, sem trocar nada.
  const irPara = (destino: "geral" | string) => {
    const sup = superficieRef.current;
    const rol = rolagemRef.current;
    if (!sup || !rol) return;
    if (!baseRef.current) prepararBase();
    const base = baseRef.current!;
    const de = { ...vistaDaTela() };
    // as vistas são medidas em relação ao topo do mapa (que rola junto com a página): o zoom num item mira a posição na TELA,
    // então soma quanto a página está rolada agora. A rolagem não é mexida: nada "teleporta" antes do movimento.
    const sc = window.scrollY;
    const alvo = destino === "geral" ? vistaGeral() : vistaDoItem(destino);
    const para: Vista = destino === "geral" ? alvo : { ...alvo, sy: alvo.sy + sc };
    const { escala: s } = paramsGeral.current;
    const m = base.m; // as margens com que o layout foi montado (não recalcular: a janela do celular pode ter mudado de altura)
    // a transformação que faz a vista `v` aparecer, a partir do mapa na escala da visão geral
    const transformDe = (v: Vista) => {
      const k = v.z / s;
      const px = (m.ml + v.qx) * s;
      const py = (m.mt + v.qy) * s;
      const tx = v.sx + base.scrollL - k * px;
      const ty = v.sy + base.scrollT - k * py;
      return `translate(${tx / s}px, ${ty / s}px) scale(${k})`;
    };
    ocupado.current = true;
    rol.dataset.rolando = "1";
    rol.style.touchAction = destino === "geral" ? "" : "none"; // com o zoom feito, arrastar não rola a página
    sup.style.transition = "none";
    sup.style.transform = transformDe(de);
    void sup.offsetHeight;
    sup.style.willChange = "transform";
    // quadros-chave sobre a curva (zoom crescendo em proporção, com início e fim suaves)
    const N = 14;
    const quadros: Keyframe[] = [];
    for (let n = 0; n <= N; n++) {
      const u = n / N;
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      quadros.push({
        offset: u,
        transform: transformDe({
          z: de.z * Math.pow(para.z / de.z, e),
          qx: de.qx + (para.qx - de.qx) * e,
          qy: de.qy + (para.qy - de.qy) * e,
          sx: de.sx + (para.sx - de.sx) * e,
          sy: de.sy + (para.sy - de.sy) * e,
        }),
      });
    }
    const anim = sup.animate(quadros, { duration: 650, easing: "linear", fill: "forwards" });
    anim.onfinish = () => {
      // o fim fica como a última posição do movimento: a transformação passa de animada a fixa, sem trocar o layout
      sup.style.transform = destino === "geral" ? "" : transformDe(para);
      anim.cancel();
      sup.style.willChange = "";
      vistaAtual.current = para;
      delete rol.dataset.rolando;
      if (destino === "geral") ajustarFolgaDoCartao(true);
      ocupado.current = false;
      processarPendente();
    };
  };
  const tocarNo = (id: string) => {
    if (!geral) {
      // mapa normal no toque: o segundo toque no mesmo item tira o destaque
      if (destacadoAntesDoToque.current === id) {
        esconder();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }
      return;
    }
    if (ocupado.current || !geralPronto.current) {
      pendente.current = id; // o mapa ainda está se movendo: guarda o toque e aplica quando parar
      return;
    }
    if (emFocoRef.current && id === destaqueRef.current) {
      // segundo toque no mesmo item: visão geral, com o destaque mantido
      mudarEmFoco(false);
      mostrarCabecalho(true);
      irPara("geral");
      return;
    }
    // primeiro toque, vizinho ou outro item: ele vira o ponto principal, no centro, com zoom
    mudarDestaque(id);
    mudarEmFoco(true);
    mostrarCabecalho(false);
    irPara(id);
  };
  // toque fora de qualquer item (ou "Voltar"): volta ao padrão, sem destaque
  const limparDestaque = () => {
    if (ocupado.current) {
      pendente.current = "#limpar";
      return;
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    mudarDestaque(null);
    esconder();
    if (emFocoRef.current) {
      mudarEmFoco(false);
      mostrarCabecalho(true);
      irPara("geral");
    } else ajustarFolgaDoCartao(false);
  };
  const processarPendente = () => {
    const p = pendente.current;
    pendente.current = null;
    if (!p) return;
    if (p === "#limpar") limparDestaque();
    else tocarNo(p);
  };
  useEffect(() => {
    if (!liberou) return;
    // a visão geral acabou de se formar: rola até o fim para o grupo Segurança (embaixo) não ficar sob a legenda
    if (!pendente.current) rolarParaVerTudo();
    processarPendente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liberou]);
  // antes do toque (o navegador ainda não "passou o mouse"): guarda quem estava destacado, para o segundo toque desfazer
  const aoPressionar = () => {
    destacadoAntesDoToque.current = noAtivo;
  };

  const cadeadoVisivel = (id: string) => visivel(id) && fluxos.filter((l) => l.de === id || l.para === id).every((l) => visivel(l.de) && visivel(l.para));
  const visivel = (id: string) => (posicao.get(id) ?? 0) < aberto;
  const oculto = (id: string) => (visivel(id) ? "" : css.oculto);

  // ao passar o mouse (ou focar com o teclado) num círculo: o balão aparece em cima dele (ou embaixo, se estiver perto do topo)
  const mostrarNo = (id: string) => {
    if (geral) return; // visão geral: o toque dá zoom no item (não há balão de explicação)
    const n = nos.get(id)!;
    const abaixo = n.y - n.r < 280;
    setNoAtivo(id);
    setDica({
      ...infoDoNo(id),
      x: limitarX(n.x),
      y: abaixo ? n.y + n.r + 14 : n.y - n.r - 14,
      abaixo,
    });
  };
  // ao passar o mouse (ou focar) num cadeado
  const mostrarCadeado = (c: { id: string; x: number; y: number }) => {
    if (geral) return;
    const abaixo = c.y < 330;
    setNoAtivo(c.id);
    setDica({
      ...infoDoCadeado(c.id),
      x: limitarX(c.x),
      y: abaixo ? c.y + 34 : c.y - 34,
      abaixo,
    });
  };
  // ao passar o mouse numa ligação: o balão segue o mouse
  const mostrarLigacao = (l: Lig, ev: MouseEvent) => {
    if (geral) return;
    const r = quadroRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const abaixo = y < 300;
    // mesma ligação: só move o balão (direto no elemento), sem refazer o estado nem redesenhar tudo
    if (ligacaoAtiva === l.id && infoRef.current) {
      infoRef.current.style.left = `${limitarX(x)}px`;
      infoRef.current.style.top = `${abaixo ? y + 22 : y - 16}px`;
      return;
    }
    setLigacaoAtiva(l.id);
    setDica({
      ...infoDaLigacao(l),
      x: limitarX(x),
      y: abaixo ? y + 22 : y - 16,
      abaixo,
    });
  };
  const esconder = () => {
    setDica(null);
    setLigacaoAtiva(null);
    setNoAtivo(null);
  };

  // Quem fica em destaque: o balão sob o mouse e seus vizinhos; os dois lados da ligação sob o mouse; ou o sistema escolhido na legenda.
  const ligAtivaObj = todasLigacoes.find((l) => l.id === ligacaoAtiva);
  const ativos: Set<string> | null = destaque
    ? new Set([destaque, ...(vizinhos.get(destaque) ?? [])])
    : noAtivo
    ? new Set([noAtivo, ...(vizinhos.get(noAtivo) ?? [])])
    : ligAtivaObj
      ? new Set([ligAtivaObj.de, ligAtivaObj.para])
      : foco
        ? new Set(todosIds.filter((id) => raizDe(id) === foco))
        : null;
  const apagado = (id: string) => `${oculto(id)} ${ativos && !ativos.has(id) ? css.apagado : ""}`;
  const fioApagado = (de: string, para: string) =>
    `${visivel(de) && visivel(para) ? "" : css.fioOculto} ${ativos && !(ativos.has(de) && ativos.has(para)) ? css.apagadoFio : ""}`;

  const resumo = [
    ...ligacoes.map(
      (l) =>
        `${porId(l.de).nome.join(" ")} se liga a ${porId(l.para).nome.join(" ")}`,
    ),
    ...sistemas.map((s) => {
      const filhos = subs
        .filter((f) => f.pai === s.id)
        .map((f) => f.nome.join(" "));
      return filhos.length
        ? `${s.nome.join(" ")} tem ${filhos.join(", ")}`
        : "";
    }),
    ...[...tracosExt, ...tracosSub].map(
      (t) =>
        `${nomeDe(t.de)}${t.projeto ? " (projeto idealizado)" : ", na internet,"} se liga a ${nomeDe(t.para)}`,
    ),
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <>
      <div className={`${css.painelLegenda} ${destaque ? css.legendaEscondida : ""}`} data-abertura={pulando ? "fim" : "andando"}>
        <p className={css.legendaProjecao}>
          <span className={css.amostraProjecao} aria-hidden="true" />
          Tracejado: projeto idealizado, ainda não existe
        </p>

        <ul
          className={css.legendaSistemas}
          aria-label="Sistemas (escolha um para destacá-lo)"
        >
          {sistemas.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={css.chipSistema}
                aria-pressed={foco === s.id}
                onClick={() => setFoco(foco === s.id ? null : s.id)}
              >
                <span
                  className={css.pontoSistema}
                  style={{ background: s.cor }}
                  aria-hidden="true"
                />
                {s.nome.join(" ")}
              </button>
            </li>
          ))}
        </ul>
        {/* visão geral (celular): o rodapé continua, com a dica que vale para ela (a de "arrastar" só vale no mapa grande) */}
        {geral && <p className={css.legendaDica}>Toque num item para ver o que ele faz e com o que se liga.</p>}
      </div>
      {/* celular: o descritivo do item escolhido, fixo embaixo (troca a cada item novo) */}
      {destaque && (
        <aside key={destaque} className={`${css.folha} ${css.folhaMapa}`} role="status" aria-live="polite">
          <button type="button" className={css.folhaFechar} onClick={limparDestaque} aria-label="Limpar destaque">
            ×
          </button>
          <div className={css.folhaCorpo}>
            <h3 className={css.folhaTitulo}>{infoDoNo(destaque).titulo}</h3>
            <p className={css.folhaTag}>{infoDoNo(destaque).etiqueta}</p>
            <p className={css.folhaTexto}>{infoDoNo(destaque).texto}</p>
            {descricoesCadeados[destaque] && (
              <p className={css.folhaCadeado}>
                <strong>🔒 Ponto de contato.</strong> {descricoesCadeados[destaque].serve} {descricoesCadeados[destaque].protecao}
              </p>
            )}
          </div>
        </aside>
      )}
      {/* celular: durante a abertura o botão pula tudo e vai direto à visão geral; depois alterna a visão geral */}
      <button
        type="button"
        className={css.zoomBtn}
        // o toque também encerra a abertura (ouvinte da janela) antes do clique: guarda se o botão estava como "Pular animação"
        onPointerDown={() => (eraPular.current = !pulando)}
        onKeyDown={() => (eraPular.current = !pulando)}
        onClick={() => {
          if (destaque) {
            limparDestaque();
            return;
          }
          if (eraPular.current || !pulando) {
            // pula tudo e já vai para a visão geral (o botão passa a dizer "Ampliar")
            setAberto(ordem.length);
            alternarGeral(true);
          } else alternarGeral(!geral);
          eraPular.current = false;
        }}
      >
        {destaque ? (emFoco ? "Voltar" : "Limpar destaque") : !pulando ? "Pular animação" : geral ? "Ampliar" : "Visão geral"}
      </button>
      <div
        className={css.rolagem}
        ref={rolagemRef}
        data-geral={geral ? "1" : undefined}
        onScroll={(e) => {
          // a janela do mapa fica sempre na posição do layout-base (o zoom é só uma transformação); rolagem que sobrar é desfeita
          if (!geral || ocupado.current) return;
          const alvo = baseRef.current?.scrollL ?? 0;
          if (e.currentTarget.scrollLeft !== alvo) e.currentTarget.scrollLeft = alvo;
        }}
        onClick={() => {
          if (geral && destaque) limparDestaque();
        }}
      >
        <div className={css.superficie} ref={superficieRef}>
          <div className={css.fundoVivo} aria-hidden="true">
            <i className={`${css.brilho} ${css.brilhoA}`} />
            <i className={`${css.brilho} ${css.brilhoB}`} />
            <i className={`${css.brilho} ${css.brilhoC}`} />
            <div className={css.ceu}>
              <i className={`${css.estrelas} ${css.estrelasA}`} />
              <i className={`${css.estrelas} ${css.estrelasB}`} />
            </div>
          </div>
          <div className={css.divisa} aria-hidden="true" />
          <div className={css.quadro} ref={quadroRef}>
            <p className={`${css.zona} ${css.zonaCima}`}>
              <strong>Na internet</strong>
              <span className={css.subZona}>qualquer pessoa com o link</span>
              <span className={css.subZona}>
                Página pública em servidor externo
              </span>
            </p>
            <p className={`${css.zona} ${css.zonaBaixo}`}>
              <strong>Dentro da paróquia</strong>
              <span className={css.subZona}>não aparece na internet</span>
              <span className={css.subZona}>
                Sem caminho físico para acessar diretamente
              </span>
            </p>
            {/* traços: ficam por baixo dos balões, que escondem as pontas */}
            <svg
              className={css.ligacoes}
              viewBox={`0 0 ${QUADRO_W} ${QUADRO_H}`}
              role="img"
              aria-label={resumo}
            >
              <defs>
                {/* dourado claro no céu, escuro na parte clara: o traço aparece nos dois fundos */}
                <linearGradient
                  id="fio-degrade"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={QUADRO_H}
                >
                  <stop offset="0" stopColor="#f3d27c" />
                  <stop
                    offset={DIVISA_Y / QUADRO_H - 0.003}
                    stopColor="#f3d27c"
                  />
                  <stop
                    offset={DIVISA_Y / QUADRO_H + 0.003}
                    stopColor="#11182a"
                  />
                  <stop offset="1" stopColor="#11182a" />
                </linearGradient>
              </defs>
              {subs.map((f, i) => (
                <path
                  key={f.id}
                  className={`${css.fio} ${css.fioSub} ${f.projeto ? css.fioProjecao : ""} ${ligacaoAtiva === `${f.pai}>${f.id}` ? css.fioAtivo : ""} ${fioApagado(f.pai, f.id)}`}
                  d={`M${f.paiX} ${f.paiY} L${f.x} ${f.y}`}
                  pathLength={1}
                  style={{ animationDelay: `${0.7 + i * 0.07}s` }}
                />
              ))}
              {tracosSub.map((t, i) => {
                const a = nos.get(t.de)!;
                const b = nos.get(t.para)!;
                return (
                  <path
                    key={t.id}
                    className={`${css.fio} ${css.fioSub} ${t.projeto ? css.fioProjecao : ""} ${ligacaoAtiva === t.id ? css.fioAtivo : ""} ${fioApagado(t.de, t.para)}`}
                    d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                    pathLength={1}
                    style={{ animationDelay: `${1.2 + i * 0.1}s` }}
                  />
                );
              })}
              {tracosExt.map((t, i) => {
                const a = nos.get(t.de)!;
                const b = nos.get(t.para)!;
                return (
                  <path
                    key={t.id}
                    className={`${css.fio} ${css.fioSub} ${t.projeto ? css.fioProjecao : ""} ${ligacaoAtiva === t.id ? css.fioAtivo : ""} ${fioApagado(t.de, t.para)}`}
                    d={caminho(a, b, t.curva)}
                    pathLength={1}
                    style={{ animationDelay: `${1.1 + i * 0.1}s` }}
                  />
                );
              })}
              {ligacoes.map((l) => {
                const a = centro(porId(l.de));
                const b = centro(porId(l.para));
                return (
                  <path
                    key={`${l.de}-${l.para}`}
                    className={`${css.fio} ${ligacaoAtiva === `${l.de}>${l.para}` ? css.fioAtivo : ""} ${fioApagado(l.de, l.para)}`}
                    d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                    pathLength={1}
                  />
                );
              })}
              {/* áreas do mouse: mais largas que o traço, para ficar fácil de acertar. Ficam sob os balões. */}
              {todasLigacoes.map((l) => (
                <path
                  key={`alvo-${l.id}`}
                  d={l.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={22}
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={(ev) => mostrarLigacao(l, ev)}
                  onMouseMove={(ev) => mostrarLigacao(l, ev)}
                  onMouseLeave={esconder}
                />
              ))}
            </svg>
            {/* pontinhos em camada própria: só ela é repintada a cada quadro da animação, não o desenho todo */}
            <svg className={`${css.ligacoes} ${css.camadaFluxo}`} viewBox={`0 0 ${QUADRO_W} ${QUADRO_H}`} aria-hidden="true">
              <defs>
                <linearGradient id="fluxo-degrade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={QUADRO_H}>
                  <stop offset="0" stopColor="#0b1633" />
                  <stop offset={DIVISA_Y / QUADRO_H - 0.003} stopColor="#0b1633" />
                  <stop offset={DIVISA_Y / QUADRO_H + 0.003} stopColor="#f3d27c" />
                  <stop offset="1" stopColor="#f3d27c" />
                </linearGradient>
              </defs>

              {fluxos.map((l) => (
                <path
                  key={`fluxo-${l.id}`}
                  className={`${css.fluxo} ${fioApagado(l.de, l.para)}`}
                  d={l.d}
                  fill="none"
                  stroke="url(#fluxo-degrade)"
                />
              ))}
            </svg>

            <ul className={css.baloes} aria-label="Sistemas da paróquia">
              {sistemas.map((s, i) => (
                <li
                  key={s.id}
                  className={`${css.balao} ${apagado(s.id)}`}
                  tabIndex={0}
                  onPointerDown={aoPressionar}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    tocarNo(s.id);
                  }}
                  onMouseEnter={() => mostrarNo(s.id)}
                  onMouseLeave={esconder}
                  onFocus={() => mostrarNo(s.id)}
                  onBlur={esconder}
                  style={
                    {
                      left: `${s.x}%`,
                      top: `${(centro(s).y / QUADRO_H) * 100}%`,
                      "--cor": s.cor,
                      "--i": i,
                      "--d": px(2 * R_SISTEMA),
                    } as CSSProperties
                  }
                  aria-label={`${s.nome.join(" ")}, ${LADO_ROTULO[s.lado]}${comContato.has(s.id) ? ", ponto de contato com a internet" : ""}`}
                >
                  <svg
                    className={css.icone}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {ICONES[s.id]}
                  </svg>
                  <span className={css.nome}>
                    {s.nome.map((linha) => (
                      <span key={linha}>{linha}</span>
                    ))}
                  </span>
                  <span className={css.traco} aria-hidden="true" />
                </li>
              ))}
              {subs.map((f, i) => (
                <li
                  key={f.id}
                  className={`${css.balao} ${css.sub} ${f.projeto ? css.projecao : ""} ${apagado(f.id)}`}
                  tabIndex={0}
                  onPointerDown={aoPressionar}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    tocarNo(f.id);
                  }}
                  onMouseEnter={() => mostrarNo(f.id)}
                  onMouseLeave={esconder}
                  onFocus={() => mostrarNo(f.id)}
                  onBlur={esconder}
                  style={
                    {
                      left: `${(f.x / QUADRO_W) * 100}%`,
                      top: `${(f.y / QUADRO_H) * 100}%`,
                      "--cor": porId(f.pai).cor,
                      "--i": i + 5,
                      "--d": px(2 * f.r),
                      "--fs":
                        f.fs ??
                        (f.r > R_SUB
                          ? "15.5px"
                          : f.r < R_SUB
                            ? "11.5px"
                            : undefined),
                    } as CSSProperties
                  }
                  aria-label={`${f.nome.join(" ")}, ${f.projeto ? "projeto idealizado, " : ""}parte do ${f.paiNome}${comContato.has(f.id) ? ", ponto de contato com a internet" : ""}`}
                >
                  <span className={css.nome}>
                    {f.nome.map((linha) => (
                      <span key={linha}>{linha}</span>
                    ))}
                  </span>
                  <span className={css.traco} aria-hidden="true" />
                </li>
              ))}
              {exts.map((e, i) => (
                <li
                  key={e.id}
                  className={`${css.balao} ${css.sub} ${e.projeto ? css.projecao : css.externo} ${apagado(e.id)}`}
                  tabIndex={0}
                  onPointerDown={aoPressionar}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    tocarNo(e.id);
                  }}
                  onMouseEnter={() => mostrarNo(e.id)}
                  onMouseLeave={esconder}
                  onFocus={() => mostrarNo(e.id)}
                  onBlur={esconder}
                  style={
                    {
                      left: `${(e.x / QUADRO_W) * 100}%`,
                      top: `${(e.y / QUADRO_H) * 100}%`,
                      "--cor": corDe(e.id),
                      "--i": i + 5 + subs.length,
                      "--d": px(2 * e.r),
                    } as CSSProperties
                  }
                  aria-label={`${e.nome.join(" ")}, ${e.projeto ? "projeto idealizado, " : ""}${LADO_ROTULO[e.lado ?? "internet"]}, ligado a ${nomeDe(e.de)}${comContato.has(e.id) ? ", ponto de contato com a internet" : ""}`}
                >
                  <span className={css.nome}>
                    {e.nome.map((linha) => (
                      <span key={linha}>{linha}</span>
                    ))}
                  </span>
                  <span className={css.traco} aria-hidden="true" />
                </li>
              ))}
            </ul>

            {/* cadeados: por cima dos balões, na borda de quem é ponto de contato */}
            <svg
              className={css.cadeados}
              viewBox={`0 0 ${QUADRO_W} ${QUADRO_H}`}
              aria-hidden="true"
            >
              {cadeados.map((c) => (
                <g
                  key={c.id}
                  className={`${css.cadeado} ${cadeadoVisivel(c.id) ? "" : css.oculto} ${ativos && !ativos.has(c.id) ? css.apagado : ""}`}
                  transform={`translate(${c.x} ${c.y})`}
                  tabIndex={0}
                  role="img"
                  aria-label={`Cadeado de ${nomeDe(c.id)}: ponto de contato com a internet`}
                  style={{ pointerEvents: "auto", cursor: "help" }}
                  onMouseEnter={() => mostrarCadeado(c)}
                  onMouseLeave={esconder}
                  onFocus={() => mostrarCadeado(c)}
                  onBlur={esconder}
                >
                  <circle r="30" fill="transparent" />
                  <circle
                    r="25"
                    fill="#0b1633"
                    stroke="#d9ad45"
                    strokeWidth="3"
                  />
                  <rect
                    x="-9"
                    y="-2"
                    width="18"
                    height="14"
                    rx="3"
                    fill="#d9ad45"
                  />
                  <path
                    d="M-5.5 -2 V-6.5 a5.5 5.5 0 0 1 11 0 V-2"
                    fill="none"
                    stroke="#d9ad45"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </svg>

            {mostrada && (
              <div
                className={`${css.info} ${mostrada.abaixo ? css.infoAbaixo : ""} ${dica ? css.infoVisivel : ""}`}
                style={{ left: mostrada.x, top: mostrada.y }}
                ref={infoRef}
                role={dica ? "tooltip" : undefined}
                aria-hidden={dica ? undefined : true}
              >
                <strong className={css.infoTitulo}>{mostrada.titulo}</strong>
                <span className={css.infoEtiqueta}>{mostrada.etiqueta}</span>
                {mostrada.texto && <p className={css.infoTexto}>{mostrada.texto}</p>}
                {mostrada.blocos?.map((b) => (
                  <p key={b.titulo} className={css.infoTexto}>
                    <strong className={css.infoBloco}>{b.titulo}</strong>
                    {b.texto}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {!geral && <p className={css.dica}>Arraste o mapa para os lados para ver tudo.</p>}
    </>
  );
}
