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
    curva: e.curvas?.[alvo],
  })),
  ...(e.ligaFuturo ?? []).map((alvo) => ({
    id: `${e.id}>${alvo}`,
    de: e.id,
    para: alvo,
    projeto: true,
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
// (projeções ainda não existem: não puxam o cadeado)
const todosOsTracos = [
  ...ligacoes.map((l) => ({ de: l.de, para: l.para })),
  ...[...tracosExt, ...tracosSub]
    .filter((t) => !t.projeto)
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

  // Abertura: os balões aparecem um a um, e a página rola sozinha para mostrar cada um. `aberto` = quantos já apareceram.
  const [aberto, setAberto] = useState(0);
  const pulando = aberto >= ordem.length;
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      const t = setTimeout(() => setAberto(ordem.length), 0);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    if (aberto >= ordem.length) return;
    const t = setTimeout(() => setAberto(aberto + 1), aberto === 0 ? 700 : ehSistema(ordem[aberto - 1]) ? 1000 : 430);
    return () => clearTimeout(t);
  }, [aberto]);
  // qualquer gesto da pessoa (rolar, tocar, digitar, clicar) encerra a abertura e mostra tudo
  useEffect(() => {
    const pular = () => setAberto(ordem.length);
    const eventos = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    eventos.forEach((e) => window.addEventListener(e, pular, { passive: true, once: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, pular));
  }, []);
  // a cada balão novo, rola suavemente até ele se estiver fora do meio da tela
  useEffect(() => {
    if (aberto < 1 || aberto > ordem.length) return;
    const n = nos.get(ordem[aberto - 1]);
    const quadro = quadroRef.current;
    const rolagem = rolagemRef.current;
    if (!n || !quadro || !rolagem) return;
    const r = quadro.getBoundingClientRect();
    const sx = r.left + n.x;
    const sy = r.top + n.y;
    const margemY = Math.min(180, window.innerHeight / 4);
    if (sy < margemY || sy > window.innerHeight - margemY) window.scrollBy({ top: sy - window.innerHeight / 2, behavior: "smooth" });
    const margemX = Math.min(200, window.innerWidth / 4);
    if (sx < margemX || sx > window.innerWidth - margemX) rolagem.scrollBy({ left: sx - window.innerWidth / 2, behavior: "smooth" });
  }, [aberto]);
  const cadeadoVisivel = (id: string) => visivel(id) && fluxos.filter((l) => l.de === id || l.para === id).every((l) => visivel(l.de) && visivel(l.para));
  const visivel = (id: string) => (posicao.get(id) ?? 0) < aberto;
  const oculto = (id: string) => (visivel(id) ? "" : css.oculto);

  // ao passar o mouse (ou focar com o teclado) num círculo: o balão aparece em cima dele (ou embaixo, se estiver perto do topo)
  const mostrarNo = (id: string) => {
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
  const ativos: Set<string> | null = noAtivo
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
      <div className={css.painelLegenda} data-abertura={pulando ? "fim" : "andando"}>
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
      </div>
      <div className={css.rolagem} ref={rolagemRef}>
        <div className={css.superficie}>
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
      <p className={css.dica}>Arraste o mapa para os lados para ver tudo.</p>
    </>
  );
}
