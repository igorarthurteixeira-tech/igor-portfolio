"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import {
  CATALOGO_ITENS,
  PORTA_Z,
  anguloAssento,
  assentoDe,
  destinosObrigatorios,
  ladoDoAnalista,
  mundo,
  naParede,
  ESTACOES,
  ESTACAO_IDS,
  contornos,
  dimensoes,
  frenteDaSala,
  lugarNasLojas,
  pegada,
  pegadaEstacao,
  pontoArquivo,
  pontoCafe,
  pontoQuadro,
  quadroNaParede,
  rotacionar,
  verificarAlvo,
  pegadaMesa,
  type Config,
  type Estacao,
  type EstacaoId,
  type Id,
  type Item,
  type Layout,
  type Mesa,
  type ModeloMesa,
  type TipoItem,
  type Vis,
} from "./planta";

/** Avisos da cena para a tela (modo de edição). */
type EventosItens = {
  aoSelecionar(id: string | null): void;
  aoSoltar(id: string, x: number, z: number, rot: number): void;
  aoRecusar(motivo: string): void;
  /** clique no chão com um item escolhido na loja: coloca ali */
  aoColocar(tipo: TipoItem, x: number, z: number, rot: number): void;
  /** fotos dos itens e modelos de mesa, geradas do próprio modelo 3D */
  aoMiniaturas(fotos: Record<string, string>): void;
};

/** Item escolhido na loja esperando o clique no lugar. */
export type Colocando = { tipo: TipoItem; rot: number } | null;

type Falas = Record<Id, string | null>;
type Motor = {
  aplicar(v: Record<Id, Vis>): void;
  notas(n: number): void;
  falas(f: Falas): void;
  config(c: Config, layout: Layout): void;
  /** liga/desliga o modo de edição e marca o que está escolhido */
  edicao(ligar: boolean, selecionado: string | null): void;
  colocar(c: Colocando): void;
  /** multiplica o zoom; 0 volta à visão inteira */
  zoom(fator: number): void;
  destruir(): void;
};

/** Escolhas no modo de edição: itens pelo id; mesas como "mesa:<chave do funcionário>". */
export const idMesa = (chave: Id) => `mesa:${chave}`;

/** Etiquetas: as dos móveis de trabalho acompanham o móvel; a do relógio fica na parede. */
const ROTULOS: { texto: string; est?: EstacaoId; y: number; x?: number; z?: number }[] = [
  { texto: "Arquivo", est: "arquivo", y: 2.1 },
  { texto: "Lojas", est: "lojas", y: 2.55 },
  { texto: "Quadro de avisos", est: "quadro", y: 2.85 },
  { texto: "Café", est: "cafe", y: 2.15 },
  { texto: "relogio", x: 4.2, y: 2.75, z: -4.25 },
];

/** Cor um pouco mais escura (para a parede lateral e os pés da mesa). */
function escurecer(THREE: typeof import("three"), hex: string, f: number) {
  return new THREE.Color(hex).multiplyScalar(f);
}

function montar(
  THREE: typeof import("three"),
  el: HTMLDivElement,
  bolhas: Record<Id, HTMLDivElement | null>,
  rotulos: (HTMLSpanElement | null)[],
  layoutInicial: Layout,
  configInicial: Config,
  eventos: EventosItens,
): Motor {
  let layout = layoutInicial;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe6fb");
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  camera.position.set(5, 14, 16);
  camera.lookAt(0, 0, 0.6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94b8, 1.7));
  const sol = new THREE.DirectionalLight(0xffffff, 2.1);
  sol.position.set(7, 15, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -17, right: 17 + (layoutInicial.direita - 10.3), top: 16 + (layoutInicial.direita - 10.3), bottom: -16, near: 1, far: 60 });
  sol.shadow.normalBias = 0.03;
  scene.add(sol);

  // profundidade da sala (cresce com a equipe); a cena é remontada quando ela muda
  const zFrente = mundo({ x: 0, y: layout.fundo }).z;
  const profundidade = zFrente + 4.3;
  const zCentro = (zFrente - 4.3) / 2;
  // largura (cresce para a direita com a ampliação lateral)
  const xDireita = layout.direita;
  const largSala = xDireita + 10.3;
  const xCentro = (xDireita - 10.3) / 2;

  // ---- utilitários: tudo é feito de caixas ----
  const unidade = new THREE.BoxGeometry(1, 1, 1);
  const materiais: T.Material[] = [];
  const cache = new Map<string, T.Material>();
  const mat = (cor: string, brilho?: string) => {
    const chave = cor + (brilho ?? "");
    let m = cache.get(chave);
    if (!m) {
      m = new THREE.MeshLambertMaterial(brilho ? { color: cor, emissive: brilho, emissiveIntensity: 0.7 } : { color: cor });
      cache.set(chave, m);
      materiais.push(m);
    }
    return m;
  };
  /** material próprio (não compartilhado), para as partes que a customização muda */
  const proprio = (cor: string) => {
    const m = new THREE.MeshLambertMaterial({ color: cor });
    materiais.push(m);
    return m;
  };
  /** Caixa com base em y (não no centro). */
  const caixa = (pai: T.Object3D, cor: string | T.Material, [w, h, d]: number[], [x, y, z]: number[], sombra = true) => {
    const m = new THREE.Mesh(unidade, typeof cor === "string" ? mat(cor) : cor);
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = sombra;
    m.receiveShadow = true;
    pai.add(m);
    return m;
  };

  // materiais customizáveis
  const mParede = proprio(configInicial.parede);
  const mParedeLado = proprio(configInicial.parede);
  const mDestaque = proprio(configInicial.destaque);
  const mMadeira = proprio(configInicial.madeira);
  const mMadeiraPe = proprio(configInicial.madeira);
  const mVidro = new THREE.MeshLambertMaterial({ color: "#bae6fd", transparent: true, opacity: 0.35 });
  materiais.push(mVidro);

  // ---- piso, paredes e janelas ----
  const tela = document.createElement("canvas");
  tela.width = tela.height = 64;
  const ctx = tela.getContext("2d")!;
  const textura = new THREE.CanvasTexture(tela);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(largSala / 2, profundidade / 2);
  textura.magFilter = THREE.NearestFilter;
  textura.colorSpace = THREE.SRGBColorSpace;
  const pintarPiso = ([a, b]: [string, string]) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
    textura.needsUpdate = true;
  };
  const piso = new THREE.MeshLambertMaterial({ map: textura });
  materiais.push(piso);
  caixa(scene, piso, [largSala + 0.3, 0.2, profundidade + 0.3], [xCentro, -0.2, zCentro], false);

  caixa(scene, mParede, [largSala + 0.3, 3.2, 0.3], [xCentro, 0, -4.45]);
  caixa(scene, mParedeLado, [0.3, 3.2, profundidade + 0.6], [-10.45, 0, zCentro - 0.15]);
  caixa(scene, mDestaque, [largSala + 0.3, 0.14, 0.04], [xCentro, 0, -4.28], false);
  caixa(scene, mDestaque, [0.04, 0.14, profundidade + 0.3], [-10.28, 0, zCentro], false);
  for (const x of [-4.4, 4.2]) {
    caixa(scene, "#94a3b8", [2.4, 1.3, 0.05], [x, 1.15, -4.29], false);
    caixa(scene, mat("#bfdbfe", "#60a5fa"), [2.2, 1.1, 0.04], [x, 1.25, -4.26], false);
    caixa(scene, "#94a3b8", [0.06, 1.1, 0.05], [x, 1.25, -4.24], false);
  }

  // bilhetes do quadro de avisos (acompanham o quadro, onde ele estiver)
  const bilhetes = new THREE.Group();
  scene.add(bilhetes);

  // ---- porta da parede esquerda ----
  {
    const z = PORTA_Z;
    const xi = -10.3; // face interna da parede
    for (const dz of [-0.71, 0.71]) caixa(scene, "#1e293b", [0.14, 2.32, 0.12], [xi + 0.02, 0, z + dz]);
    caixa(scene, "#1e293b", [0.14, 0.14, 1.54], [xi + 0.02, 2.26, z]);
    caixa(scene, "#8b5a2b", [0.06, 2.24, 1.3], [xi + 0.04, 0.02, z], false);
    for (const y of [0.25, 1.3]) caixa(scene, "#a0703c", [0.02, 0.75, 0.95], [xi + 0.08, y, z], false);
    caixa(scene, "#fbbf24", [0.08, 0.08, 0.08], [xi + 0.12, 1.05, z - 0.48], false);
    caixa(scene, mat("#16a34a", "#22c55e"), [0.04, 0.24, 0.62], [xi + 0.04, 2.48, z], false);
    caixa(scene, "#f8fafc", [0.02, 0.08, 0.3], [xi + 0.065, 2.56, z], false);
    caixa(scene, "#475569", [0.8, 0.02, 1.25], [xi + 0.5, 0, z], false);
  }

  // ---- mesas de trabalho (4 modelos) ----
  /** Mesa com a origem no centro do tampo; a pessoa fica do lado -z, de frente para +z. */
  function construirMesa(modelo: ModeloMesa): T.Group {
    const g = new THREE.Group();
    const cadeira = (cor: string, alta = false) => {
      caixa(g, cor, [0.62, 0.08, 0.6], [0, 0.45, -1.1]);
      caixa(g, cor, [0.62, alta ? 0.85 : 0.6, 0.08], [0, 0.53, -1.43]);
      caixa(g, "#475569", [0.08, 0.45, 0.08], [0, 0, -1.1]);
    };
    const pes = (cor: string | T.Material) => {
      for (const [dx, dz] of [[-1.2, -0.43], [1.2, -0.43], [-1.2, 0.43], [1.2, 0.43]]) caixa(g, cor, [0.08, 0.72, 0.08], [dx, 0, dz]);
    };
    const monitor = (x: number, w = 1.0, cor = "#5b8cff") => {
      caixa(g, "#334155", [0.12, 0.22, 0.12], [x, 0.8, 0.25]);
      caixa(g, "#0f172a", [w, 0.6, 0.06], [x, 0.98, 0.25]);
      caixa(g, mat(cor, "#2563eb"), [w - 0.1, 0.5, 0.02], [x, 1.03, 0.21], false);
    };
    if (modelo === "vidro") {
      caixa(g, mVidro, [2.6, 0.05, 1.0], [0, 0.72, 0]);
      for (const dx of [-1.2, 1.2]) {
        caixa(g, "#94a3b8", [0.05, 0.72, 0.05], [dx, 0, -0.43]);
        caixa(g, "#94a3b8", [0.05, 0.72, 0.05], [dx, 0, 0.43]);
      }
      caixa(g, "#cbd5e1", [0.7, 0.03, 0.5], [0, 0.77, 0]); // notebook
      caixa(g, "#334155", [0.7, 0.45, 0.03], [0, 0.78, 0.24]);
      caixa(g, mat("#bae6fd", "#38bdf8"), [0.62, 0.38, 0.01], [0, 0.82, 0.22], false);
      caixa(g, "#f8fafc", [0.14, 0.16, 0.14], [0.85, 0.77, -0.1]);
      cadeira("#e2e8f0", true);
    } else if (modelo === "gamer") {
      caixa(g, "#111827", [2.7, 0.08, 1.05], [0, 0.72, 0]);
      for (const dx of [-1.25, 1.25]) caixa(g, "#111827", [0.12, 0.72, 0.9], [dx, 0, 0]);
      caixa(g, mat("#f472b6", "#db2777"), [2.65, 0.03, 0.03], [0, 0.69, -0.52], false); // luz colorida
      caixa(g, mat("#a78bfa", "#7c3aed"), [0.03, 0.03, 1.0], [-1.33, 0.69, 0], false);
      caixa(g, mat("#22d3ee", "#0891b2"), [0.03, 0.03, 1.0], [1.33, 0.69, 0], false);
      monitor(-0.5, 0.95, "#c084fc");
      monitor(0.5, 0.95, "#67e8f9");
      caixa(g, "#1f2937", [0.8, 0.04, 0.25], [0, 0.8, -0.2]);
      caixa(g, mat("#22c55e", "#16a34a"), [0.78, 0.01, 0.23], [0, 0.84, -0.2], false);
      // cadeira gamer
      caixa(g, "#111827", [0.66, 0.1, 0.62], [0, 0.45, -1.1]);
      caixa(g, "#dc2626", [0.66, 1.05, 0.1], [0, 0.55, -1.43]);
      caixa(g, "#111827", [0.4, 0.8, 0.11], [0, 0.65, -1.43]);
      caixa(g, "#475569", [0.08, 0.45, 0.08], [0, 0, -1.1]);
    } else if (modelo === "executiva") {
      caixa(g, "#3f2a1a", [2.7, 0.1, 1.05], [0, 0.72, 0]);
      caixa(g, "#2b1d12", [0.7, 0.72, 0.9], [0.95, 0, 0]); // gaveteiro
      for (const y of [0.18, 0.42]) caixa(g, "#d4a373", [0.25, 0.04, 0.02], [0.95, y, -0.46], false);
      for (const dx of [-1.25]) for (const dz of [-0.43, 0.43]) caixa(g, "#2b1d12", [0.08, 0.72, 0.08], [dx, 0, dz]);
      monitor(-0.45, 0.85);
      monitor(0.45, 0.85);
      caixa(g, "#e2e8f0", [0.7, 0.03, 0.22], [0, 0.82, -0.2]);
      cadeira("#111827", true);
    } else if (modelo === "moderna") {
      caixa(g, "#f8fafc", [2.6, 0.06, 1.0], [0, 0.72, 0]);
      for (const dx of [-1.15, 1.15]) caixa(g, "#94a3b8", [0.06, 0.72, 0.9], [dx, 0, 0]);
      caixa(g, mat("#38bdf8", "#0ea5e9"), [2.5, 0.03, 0.03], [0, 0.69, -0.49], false); // luz de LED
      monitor(0, 1.6, "#a5b4fc");
      caixa(g, "#e2e8f0", [0.7, 0.03, 0.22], [0, 0.78, -0.2]);
      cadeira("#64748b", true);
    } else {
      caixa(g, mMadeira, [2.6, 0.08, 1.0], [0, 0.72, 0]);
      pes(mMadeiraPe);
      monitor(0);
      caixa(g, "#e2e8f0", [0.7, 0.03, 0.22], [0, 0.8, -0.2]);
      caixa(g, "#f8fafc", [0.14, 0.16, 0.14], [0.85, 0.8, -0.1]);
      cadeira("#1e293b");
      if (modelo === "baia") {
        caixa(g, "#64748b", [2.7, 1.45, 0.08], [0, 0, 0.56]); // divisória da frente
        for (const dx of [-1.33, 1.33]) caixa(g, "#64748b", [0.08, 1.45, 1.1], [dx, 0, 0.05]);
        caixa(g, mDestaque, [2.7, 0.06, 0.1], [0, 1.45, 0.56], false);
      }
    }
    return g;
  }

  // ---- móveis de trabalho: arquivo, prateleira das lojas, café e quadro de avisos ----
  function construirEstacao(id: EstacaoId): T.Group {
    const g = new THREE.Group();
    if (id === "arquivo") {
      for (const dx of [-1, 0, 1]) {
        caixa(g, "#94a3b8", [0.9, 1.75, 0.8], [dx, 0, 0]);
        for (const y of [0.55, 1.12]) caixa(g, "#64748b", [0.9, 0.03, 0.02], [dx, y, 0.41], false);
        for (const y of [0.3, 0.85, 1.42]) caixa(g, "#e2e8f0", [0.24, 0.06, 0.04], [dx, y, 0.42], false);
      }
    } else if (id === "lojas") {
      caixa(g, "#cbd5e1", [4.4, 2.3, 0.12], [0, 0, -0.4]);
      for (const dx of [-2.15, 2.15]) caixa(g, "#94a3b8", [0.1, 2.3, 0.85], [dx, 0, 0]);
      caixa(g, "#94a3b8", [4.4, 0.08, 0.85], [0, 1.15, 0]);
      caixa(g, "#94a3b8", [4.4, 0.08, 0.85], [0, 2.25, 0]);
      for (const dx of [-1.35, 0, 1.35]) {
        caixa(g, "#f1f5f9", [0.75, 1.05, 0.6], [dx, 0.04, 0]);
        caixa(g, "#cbd5e1", [0.75, 0.02, 0.02], [dx, 0.7, 0.31], false);
        caixa(g, "#64748b", [0.04, 0.22, 0.04], [dx + 0.28, 0.35, 0.32], false);
        caixa(g, "#475569", [0.08, 0.1, 0.2], [dx, 1.23, -0.05]);
        caixa(g, "#0f172a", [1.05, 0.62, 0.06], [dx, 1.33, 0]);
        caixa(g, mat("#3b82f6", "#1d4ed8"), [0.95, 0.52, 0.02], [dx, 1.38, 0.04], false);
      }
    } else if (id === "cafe") {
      caixa(g, "#cbd5e1", [0.9, 0.95, 1.2], [0, 0, 0]);
      caixa(g, "#475569", [0.6, 0.85, 0.75], [0, 0.95, -0.05]);
      caixa(g, "#0f172a", [0.45, 0.3, 0.04], [0, 1.35, 0.33], false);
      caixa(g, mat("#22c55e", "#16a34a"), [0.06, 0.06, 0.03], [0.15, 1.55, 0.35], false);
      caixa(g, "#f8fafc", [0.14, 0.16, 0.14], [0, 0.95, 0.3]);
    } else {
      caixa(g, "#5b8cff", [4.2, 1.5, 0.06], [0, 1.1, 0], false);
      caixa(g, "#f5f7ff", [4, 1.3, 0.05], [0, 1.2, 0.05], false);
    }
    return g;
  }
  const posicionarEstacao = (g: T.Object3D, e: Estacao) => {
    g.position.set(e.x, 0, e.z);
    g.rotation.y = (e.rot * Math.PI) / 2;
  };

  // ---- itens decorativos ----
  const geoVaso = new THREE.CylinderGeometry(0.32, 0.24, 0.55, 8);
  const geoFolhas = new THREE.IcosahedronGeometry(0.62, 0);
  function construir(tipo: TipoItem, tam = 0): T.Group {
    const g = new THREE.Group();
    switch (tipo) {
      case "planta": {
        const vaso = new THREE.Mesh(geoVaso, mat("#b45309"));
        vaso.position.set(0, 0.275, 0);
        const folhas = new THREE.Mesh(geoFolhas, mat("#16a34a"));
        folhas.position.set(0, 1.05, 0);
        vaso.castShadow = folhas.castShadow = true;
        g.add(vaso, folhas);
        break;
      }
      case "sofa":
        caixa(g, "#334155", [2.4, 0.45, 0.95], [0, 0, 0]);
        caixa(g, "#334155", [2.4, 0.6, 0.25], [0, 0.45, 0.35]);
        for (const dx of [-1.1, 1.1]) caixa(g, "#1e293b", [0.22, 0.65, 0.95], [dx, 0, 0]);
        for (const dx of [-0.5, 0.5]) caixa(g, "#475569", [0.95, 0.12, 0.7], [dx, 0.45, -0.08]);
        break;
      case "tapete":
        caixa(g, "#7c3aed", [4.0, 0.02, 1.7], [0, 0, 0], false);
        caixa(g, "#a78bfa", [3.6, 0.025, 1.3], [0, 0, 0], false);
        break;
      case "estante": {
        for (const dx of [-0.82, 0.82]) caixa(g, "#6b4f2f", [0.06, 2.0, 0.45], [dx, 0, 0]);
        caixa(g, "#5b4026", [1.7, 2.0, 0.04], [0, 0, 0.2]);
        for (const y of [0, 0.66, 1.32, 1.96]) caixa(g, "#8b5a2b", [1.64, 0.05, 0.45], [0, y, 0]);
        const livros = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2"];
        [0.05, 0.71].forEach((y, f) => {
          for (let i = 0; i < 6; i++) caixa(g, livros[(i + f * 2) % 6], [0.14, 0.42 + ((i * 7) % 3) * 0.05, 0.3], [-0.6 + i * 0.2, y, -0.02]);
        });
        caixa(g, "#e2e8f0", [0.5, 0.3, 0.3], [0.3, 1.37, 0]);
        break;
      }
      case "luminaria":
        caixa(g, "#1f2937", [0.42, 0.05, 0.42], [0, 0, 0]);
        caixa(g, "#374151", [0.06, 1.55, 0.06], [0, 0.05, 0]);
        caixa(g, mat("#fef3c7", "#fbbf24"), [0.5, 0.36, 0.5], [0, 1.55, 0]);
        break;
      case "bebedouro":
        caixa(g, "#e2e8f0", [0.5, 0.95, 0.45], [0, 0, 0]);
        caixa(g, "#94a3b8", [0.3, 0.05, 0.12], [0, 0.65, -0.25], false);
        const galao = new THREE.Mesh(geoVaso, mVidro);
        galao.scale.set(0.7, 0.9, 0.7);
        galao.position.set(0, 1.2, 0);
        g.add(galao);
        break;
      case "impressora":
        caixa(g, "#475569", [0.9, 0.55, 0.7], [0, 0, 0]);
        caixa(g, "#e2e8f0", [0.95, 0.35, 0.75], [0, 0.55, 0]);
        caixa(g, "#f8fafc", [0.5, 0.02, 0.35], [0, 0.92, -0.1], false);
        caixa(g, mat("#22c55e", "#16a34a"), [0.08, 0.04, 0.02], [0.3, 0.75, -0.38], false);
        break;
      case "mesa_centro":
        caixa(g, "#8b5a2b", [0.95, 0.06, 0.95], [0, 0.4, 0]);
        for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) caixa(g, "#5b4026", [0.06, 0.4, 0.06], [dx, 0, dz]);
        caixa(g, "#f8fafc", [0.14, 0.16, 0.14], [0.15, 0.46, 0.1]);
        caixa(g, "#dc2626", [0.3, 0.04, 0.22], [-0.2, 0.46, -0.15]);
        break;
      case "divisoria":
        caixa(g, "#64748b", [2.0, 1.5, 0.1], [0, 0, 0]);
        caixa(g, mDestaque, [2.0, 0.06, 0.12], [0, 1.5, 0], false);
        for (const dx of [-0.9, 0.9]) caixa(g, "#334155", [0.08, 0.06, 0.35], [dx, 0, 0]);
        break;
      case "mesa_reuniao":
        caixa(g, mMadeira, [2.6, 0.08, 1.2], [0, 0.72, 0]);
        for (const dx of [-1.0, 1.0]) caixa(g, mMadeiraPe, [0.12, 0.72, 0.8], [dx, 0, 0]);
        for (const dx of [-0.75, 0, 0.75])
          for (const lado of [-1, 1]) {
            caixa(g, "#1e293b", [0.5, 0.08, 0.45], [dx, 0.45, lado * 0.85]);
            caixa(g, "#1e293b", [0.5, 0.5, 0.07], [dx, 0.53, lado * 1.06]);
          }
        caixa(g, "#0f172a", [0.4, 0.04, 0.3], [0, 0.8, 0], false);
        break;
      case "cabine":
        caixa(g, "#334155", [1.5, 0.1, 1.5], [0, 0, 0]);
        caixa(g, "#334155", [1.5, 0.12, 1.5], [0, 2.2, 0]);
        caixa(g, "#475569", [1.5, 2.2, 0.08], [0, 0.1, 0.71]);
        for (const dx of [-0.71, 0.71]) caixa(g, "#475569", [0.08, 2.2, 1.5], [dx, 0.1, 0]);
        caixa(g, mVidro, [1.34, 2.1, 0.04], [0, 0.1, -0.72], false); // porta de vidro
        caixa(g, "#94a3b8", [0.6, 0.06, 0.4], [0, 0.95, 0.45]);
        caixa(g, "#1e293b", [0.45, 0.45, 0.45], [0, 0.1, 0.1]);
        caixa(g, mat("#fef3c7", "#fbbf24"), [0.5, 0.03, 0.5], [0, 2.17, 0], false);
        break;
      case "sala_reuniao":
      case "copa":
      case "sala_descanso": {
        const t = dimensoes({ id: "", tipo, x: 0, z: 0, rot: 0, tam });
        const w = t.w / 2;
        const d = t.d / 2;
        const vidroTodo = tipo === "sala_reuniao";
        const corParede = tipo === "copa" ? "#e2e8f0" : "#c7d2fe";
        // piso próprio do cômodo
        caixa(g, tipo === "copa" ? "#f1f5f9" : tipo === "sala_descanso" ? "#ede9fe" : "#e0e7ff", [t.w, 0.215, t.d], [0, -0.2, 0], false);
        const parede = (cx: number, cz: number, pw: number, pd: number, frente = false) => {
          if (vidroTodo) {
            caixa(g, mVidro, [pw, 2.2, pd], [cx, 0, cz], false);
            caixa(g, "#334155", [pw, 0.08, pd + 0.02], [cx, 2.2, cz], false);
          } else if (frente) {
            caixa(g, corParede, [pw, 1.0, pd], [cx, 0, cz]);
            caixa(g, mVidro, [pw, 1.2, pd * 0.6], [cx, 1.0, cz], false);
            caixa(g, "#334155", [pw, 0.06, pd + 0.02], [cx, 2.2, cz], false);
          } else {
            caixa(g, corParede, [pw, 2.2, pd], [cx, 0, cz]);
            caixa(g, mDestaque, [pw + 0.01, 0.08, pd + 0.01], [cx, 2.2, cz], false);
          }
        };
        parede(0, -d + 0.06, t.w, 0.12);
        parede(-w + 0.06, 0, 0.12, t.d);
        parede(w - 0.06, 0, 0.12, t.d);
        const lado = (w - 0.65) / 2;
        parede(-0.65 - lado, d - 0.06, w - 0.65, 0.12, true);
        parede(0.65 + lado, d - 0.06, w - 0.65, 0.12, true);
        for (const dx of [-0.65, 0.65]) caixa(g, "#334155", [0.06, 2.2, 0.14], [dx, 0, d - 0.06]); // batentes
        if (tipo === "sala_reuniao") {
          caixa(g, mMadeira, [2.8, 0.08, 1.2], [0, 0.72, -0.2]);
          for (const dx of [-1.1, 1.1]) caixa(g, mMadeiraPe, [0.12, 0.72, 0.8], [dx, 0, -0.2]);
          for (const dx of [-0.9, 0, 0.9])
            for (const ladoZ of [-1, 1]) {
              caixa(g, "#1e293b", [0.5, 0.08, 0.45], [dx, 0.45, -0.2 + ladoZ * 0.85]);
              caixa(g, "#1e293b", [0.5, 0.5, 0.07], [dx, 0.53, -0.2 + ladoZ * 1.06]);
            }
          caixa(g, "#0f172a", [1.8, 1.0, 0.06], [0, 1.0, -d + 0.15]); // TV
          caixa(g, mat("#5b8cff", "#2563eb"), [1.7, 0.9, 0.02], [0, 1.05, -d + 0.19], false);
        } else if (tipo === "copa") {
          caixa(g, "#94a3b8", [2.6, 0.9, 0.6], [-0.4, 0, -d + 0.42]); // bancada
          caixa(g, "#f8fafc", [2.6, 0.05, 0.62], [-0.4, 0.9, -d + 0.42]);
          caixa(g, "#cbd5e1", [0.5, 0.06, 0.35], [-1.0, 0.92, -d + 0.42]); // pia
          caixa(g, "#1f2937", [0.55, 0.32, 0.35], [0.2, 0.95, -d + 0.42]); // micro-ondas
          caixa(g, "#e2e8f0", [0.8, 1.9, 0.7], [w - 0.55, 0, -d + 0.5]); // geladeira
          caixa(g, "#94a3b8", [0.03, 0.5, 0.05], [w - 0.88, 1.0, -d + 0.86], false);
          caixa(g, "#f8fafc", [0.9, 0.05, 0.9], [-0.3, 0.75, 0.35]); // mesa redonda
          caixa(g, "#64748b", [0.08, 0.75, 0.08], [-0.3, 0, 0.35]);
          for (const dx of [-0.95, 0.35]) caixa(g, "#f59e0b", [0.38, 0.5, 0.38], [dx, 0, 0.35]);
        } else {
          caixa(g, "#7c3aed", [2.6, 0.02, 1.5], [0, 0, 0.1], false); // tapete
          caixa(g, "#6d28d9", [2.4, 0.45, 0.85], [0, 0, -d + 0.6]); // sofá
          caixa(g, "#6d28d9", [2.4, 0.6, 0.22], [0, 0.45, -d + 0.3]);
          for (const dx of [-1.1, 1.1]) caixa(g, "#5b21b6", [0.2, 0.62, 0.85], [dx, 0, -d + 0.6]);
          for (const dx of [-0.6, 0.6]) caixa(g, "#f472b6", [0.5, 0.35, 0.5], [dx, 0, 0.5]); // puffs
          caixa(g, "#374151", [0.06, 1.5, 0.06], [w - 0.4, 0, -d + 0.4]);
          caixa(g, mat("#fef3c7", "#fbbf24"), [0.45, 0.3, 0.45], [w - 0.4, 1.5, -d + 0.4]);
          const vaso = new THREE.Mesh(geoVaso, mat("#b45309"));
          vaso.position.set(-w + 0.45, 0.275, -d + 0.45);
          const folhas = new THREE.Mesh(geoFolhas, mat("#16a34a"));
          folhas.position.set(-w + 0.45, 1.05, -d + 0.45);
          g.add(vaso, folhas);
        }
        break;
      }
      default:
        // quadro de arte (feito de frente para +x; na parede do fundo gira para +z)
        caixa(g, "#1e293b", [0.06, 1.1, 1.6], [0, 0, 0], false);
        caixa(g, "#fbbf24", [0.03, 0.5, 0.7], [0.04, 0.45, -0.3], false);
        caixa(g, "#38bdf8", [0.03, 0.7, 0.6], [0.04, 0.2, 0.35], false);
        caixa(g, "#f43f5e", [0.03, 0.3, 0.35], [0.05, 0.15, -0.35], false);
    }
    return g;
  }
  function posicionar(g: T.Object3D, it: Item) {
    if (CATALOGO_ITENS[it.tipo].parede) {
      g.position.set(it.x, 1.0, it.z);
      g.rotation.y = it.x < -10 ? 0 : -Math.PI / 2;
    } else {
      g.position.set(it.x, 0, it.z);
      g.rotation.y = (it.rot * Math.PI) / 2;
    }
  }
  const posicionarMesa = (g: T.Object3D, m: Mesa) => {
    g.position.set(m.x, 0, m.z);
    g.rotation.y = (m.rot * Math.PI) / 2;
  };

  const gMoveis = new THREE.Group();
  scene.add(gMoveis);
  // contornos ("hitbox") de tudo que ocupa o chão, só no modo de edição
  const gContornos = new THREE.Group();
  scene.add(gContornos);
  const matContorno = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, depthWrite: false });
  materiais.push(matContorno);
  function montarContornos() {
    gContornos.clear();
    gContornos.visible = edicao;
    if (!edicao) return;
    for (const { r } of contornos({ layout, itens: itensAtuais })) {
      const w = r.x2 - r.x1;
      const d = r.z2 - r.z1;
      const linha = (lw: number, ld: number, x: number, z: number) => {
        const m = new THREE.Mesh(unidade, matContorno);
        m.scale.set(lw, 0.02, ld);
        m.position.set(x, 0.03, z);
        gContornos.add(m);
      };
      linha(w, 0.04, (r.x1 + r.x2) / 2, r.z1);
      linha(w, 0.04, (r.x1 + r.x2) / 2, r.z2);
      linha(0.04, d, r.x1, (r.z1 + r.z2) / 2);
      linha(0.04, d, r.x2, (r.z1 + r.z2) / 2);
    }
  }
  const objetos = new Map<string, T.Group>();
  let itensAtuais: Item[] = [];
  /** Remonta mesas e itens a partir da planta e da lista salva. */
  function montarMoveis(itens: Item[]) {
    itensAtuais = itens;
    gMoveis.clear();
    objetos.clear();
    for (const a of layout.agentes) {
      const m = layout.mesas[a.chave];
      const g = construirMesa(m.modelo);
      const id = idMesa(a.chave);
      g.traverse((o) => (o.userData.alvo = id));
      posicionarMesa(g, m);
      gMoveis.add(g);
      objetos.set(id, g);
    }
    for (const id of ESTACAO_IDS) {
      const e = layout.estacoes[id];
      const g = construirEstacao(id);
      g.traverse((o) => (o.userData.alvo = `estacao:${id}`));
      posicionarEstacao(g, e);
      gMoveis.add(g);
      objetos.set(`estacao:${id}`, g);
      if (id === "quadro") posicionarEstacao(bilhetes, e);
    }
    montarContornos();
    for (const it of itens) {
      const g = construir(it.tipo, it.tam ?? 0);
      g.traverse((o) => (o.userData.alvo = it.id));
      posicionar(g, it);
      gMoveis.add(g);
      objetos.set(it.id, g);
    }
  }

  // ---- modo de edição: lugares que precisam ficar livres (verde) e marca do escolhido ----
  const gDestinos = new THREE.Group();
  const matDestino = new THREE.MeshBasicMaterial({ color: "#22c55e", transparent: true, opacity: 0.35, depthWrite: false });
  materiais.push(matDestino);
  const geoAnel = new THREE.RingGeometry(0.16, 0.3, 20);
  geoAnel.rotateX(-Math.PI / 2);
  function marcarDestinos() {
    gDestinos.clear();
    for (const d of [...destinosObrigatorios(layout), { nome: "porta", pos: { x: 30, y: 450 } }]) {
      const w = mundo(d.pos);
      const anel = new THREE.Mesh(geoAnel, matDestino);
      anel.position.set(w.x, 0.02, w.z);
      gDestinos.add(anel);
    }
  }
  gDestinos.visible = false;
  scene.add(gDestinos);
  const matMarca = new THREE.MeshBasicMaterial({ color: "#22c55e", transparent: true, opacity: 0.45, depthWrite: false });
  materiais.push(matMarca);
  const marca = new THREE.Mesh(unidade, matMarca);
  marca.visible = false;
  scene.add(marca);

  type Alvo = { tipo: "item"; item: Item } | { tipo: "mesa"; chave: Id; mesa: Mesa } | { tipo: "estacao"; id: EstacaoId; est: Estacao };
  const idDoAlvo = (a: Alvo) => (a.tipo === "item" ? a.item.id : a.tipo === "mesa" ? idMesa(a.chave) : `estacao:${a.id}`);
  const posDoAlvo = (a: Alvo) => (a.tipo === "item" ? a.item : a.tipo === "mesa" ? a.mesa : a.est);
  /** O alvo numa posição nova. */
  const alvoEm = (a: Alvo, x: number, z: number, rot: number): Alvo =>
    a.tipo === "item"
      ? { ...a, item: { ...a.item, x, z, rot } }
      : a.tipo === "mesa"
        ? { ...a, mesa: { ...a.mesa, x, z, rot } }
        : { ...a, est: { x, z, rot } };
  /** Cenário com o alvo na posição dele (para testar antes de soltar). */
  const cenarioCom = (a: Alvo) => ({
    layout: {
      ...layout,
      mesas: a.tipo === "mesa" ? { ...layout.mesas, [a.chave]: a.mesa } : layout.mesas,
      estacoes: a.tipo === "estacao" ? { ...layout.estacoes, [a.id]: a.est } : layout.estacoes,
    },
    itens: a.tipo === "item" ? itensAtuais.map((i) => (i.id === a.item.id ? a.item : i)) : itensAtuais,
  });
  /** Verde/vermelho: o alvo, onde está, está num lugar disponível para ele? */
  const situacaoDo = (a: Alvo) => verificarAlvo(cenarioCom(a), idDoAlvo(a));
  const marcarSelecionado = () => {
    const a = alvoDe(selecionado);
    marcar(a, a ? situacaoDo(a).ok : true);
  };
  function alvoDe(id: string | null): Alvo | null {
    if (!id) return null;
    if (id.startsWith("estacao:")) {
      const eid = id.slice(8) as EstacaoId;
      return layout.estacoes[eid] ? { tipo: "estacao", id: eid, est: layout.estacoes[eid] } : null;
    }
    if (id.startsWith("mesa:")) {
      const chave = id.slice(5);
      return layout.mesas[chave] ? { tipo: "mesa", chave, mesa: layout.mesas[chave] } : null;
    }
    const item = itensAtuais.find((i) => i.id === id);
    return item ? { tipo: "item", item } : null;
  }
  function marcar(a: Alvo | null, valido = true) {
    if (!a || !edicao) {
      marca.visible = false;
      return;
    }
    matMarca.color.set(valido ? "#22c55e" : "#ef4444");
    const naParede = (a.tipo === "item" && CATALOGO_ITENS[a.item.tipo].parede) || (a.tipo === "estacao" && ESTACOES[a.id].parede);
    if (naParede) {
      const pos = posDoAlvo(a);
      const largura = (a.tipo === "estacao" ? ESTACOES[a.id].w : CATALOGO_ITENS.quadro.w) + 0.15;
      const naEsquerda = pos.x < -10;
      marca.scale.set(naEsquerda ? 0.04 : largura, a.tipo === "estacao" ? 1.65 : 1.25, naEsquerda ? largura : 0.04);
      marca.position.set(naEsquerda ? -10.25 : pos.x, a.tipo === "estacao" ? 1.1 : 1.55, naEsquerda ? pos.z : -4.25);
    } else {
      const p = a.tipo === "item" ? pegada(a.item) : a.tipo === "mesa" ? pegadaMesa(a.mesa) : pegadaEstacao(a.id, a.est);
      marca.scale.set(p.x2 - p.x1 + 0.1, 0.02, p.z2 - p.z1 + 0.1);
      marca.position.set((p.x1 + p.x2) / 2, 0.02, (p.z1 + p.z2) / 2);
    }
    marca.visible = true;
  }
  let edicao = false;
  let selecionado: string | null = null;
  let arraste: { alvo: Alvo; dx: number; dz: number; x: number; z: number; rot: number; valido: boolean; motivo: string } | null = null;

  // ---- colocar item novo: prévia transparente que segue o ponteiro ----
  let colocando: Colocando = null;
  let fantasma: T.Group | null = null;
  const matsFantasma: T.Material[] = [];
  let candidato: { item: Item; valido: boolean; motivo: string } | null = null;
  function limparFantasma() {
    if (fantasma) scene.remove(fantasma);
    fantasma = null;
    matsFantasma.splice(0).forEach((m) => m.dispose());
    candidato = null;
    if (!arraste) marcarSelecionado();
  }
  function montarFantasma(tipo: TipoItem) {
    limparFantasma();
    fantasma = construir(tipo);
    fantasma.traverse((o) => {
      const m = o as T.Mesh;
      if (!m.isMesh) return;
      const novo = (m.material as T.Material).clone();
      novo.transparent = true;
      novo.opacity = 0.55;
      novo.depthWrite = false;
      matsFantasma.push(novo);
      m.material = novo;
      m.castShadow = false;
    });
    fantasma.visible = false;
    scene.add(fantasma);
  }

  // ---- miniaturas: cada item e cada modelo de mesa fotografado sozinho ----
  function gerarMiniaturas(): Record<string, string> {
    const fotos: Record<string, string> = {};
    let r: T.WebGLRenderer | null = null;
    try {
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1);
      r.setSize(160, 120, false);
      const cena = new THREE.Scene();
      cena.add(new THREE.HemisphereLight(0xffffff, 0x8a94b8, 2.0));
      const luz = new THREE.DirectionalLight(0xffffff, 2.0);
      luz.position.set(4, 8, 6);
      cena.add(luz);
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const caixaB = new THREE.Box3();
      const centroB = new THREE.Vector3();
      const tam = new THREE.Vector3();
      const rr = r;
      const fotografar = (obj: T.Object3D) => {
        cena.add(obj);
        caixaB.setFromObject(obj);
        caixaB.getCenter(centroB);
        caixaB.getSize(tam);
        const raioB = Math.max(tam.x, tam.y, tam.z) * 0.62 + 0.1;
        cam.position.copy(centroB).add(new THREE.Vector3(1.1, 1.0, 1.5).normalize().multiplyScalar(20));
        cam.lookAt(centroB);
        Object.assign(cam, { left: -raioB * (4 / 3), right: raioB * (4 / 3), top: raioB, bottom: -raioB });
        cam.updateProjectionMatrix();
        rr.render(cena, cam);
        const url = rr.domElement.toDataURL("image/png");
        cena.remove(obj);
        return url;
      };
      for (const tipo of Object.keys(CATALOGO_ITENS) as TipoItem[]) {
        const obj = construir(tipo, 0);
        if (CATALOGO_ITENS[tipo].parede) obj.rotation.y = -Math.PI / 2;
        fotos[tipo] = fotografar(obj);
      }
      for (const modelo of ["simples", "moderna", "vidro", "baia", "executiva", "gamer"] as ModeloMesa[]) {
        fotos[`mesa:${modelo}`] = fotografar(construirMesa(modelo));
      }
    } catch {
      // sem WebGL extra: a loja mostra só os nomes
    } finally {
      r?.dispose();
    }
    return fotos;
  }

  // ---- pessoas ----
  type Pessoa = {
    g: T.Group;
    pernas: [T.Group, T.Group];
    bracos: [T.Group, T.Group];
    camisa: T.MeshLambertMaterial;
    corPadrao: string;
    de: T.Vector3;
    para: T.Vector3;
    inicio: number;
    dur: number;
    fase: number;
  };
  const pessoas = {} as Record<Id, Pessoa>;
  for (const p of layout.agentes) {
    const g = new THREE.Group();
    const camisa = proprio(p.corPadrao);
    const membro = (cor: string | T.Material, [w, h, d]: number[], [x, y, z]: number[]) => {
      const pivo = new THREE.Group();
      pivo.position.set(x, y, z);
      caixa(pivo, cor, [w, h, d], [0, -h, 0]);
      g.add(pivo);
      return pivo;
    };
    const pernas: [T.Group, T.Group] = [
      membro("#1e293b", [0.22, 0.6, 0.26], [-0.14, 0.62, 0]),
      membro("#1e293b", [0.22, 0.6, 0.26], [0.14, 0.62, 0]),
    ];
    caixa(g, camisa, [0.6, 0.64, 0.34], [0, 0.6, 0]);
    const bracos: [T.Group, T.Group] = [
      membro(camisa, [0.16, 0.56, 0.2], [-0.39, 1.2, 0]),
      membro(camisa, [0.16, 0.56, 0.2], [0.39, 1.2, 0]),
    ];
    for (const b of bracos) caixa(b, "#f2c9a0", [0.14, 0.12, 0.16], [0, -0.66, 0]);
    caixa(g, "#f2c9a0", [0.48, 0.46, 0.44], [0, 1.24, 0]);
    caixa(g, p.cabelo, [0.52, 0.14, 0.48], [0, 1.66, 0]);
    caixa(g, p.cabelo, [0.52, 0.3, 0.1], [0, 1.4, -0.21]);
    for (const dx of [-0.11, 0.11]) caixa(g, "#1f2937", [0.07, 0.08, 0.02], [dx, 1.44, 0.225], false);
    if (p.detalhe === "bone") {
      caixa(g, "#f59e0b", [0.54, 0.16, 0.5], [0, 1.7, 0]);
      caixa(g, "#f59e0b", [0.44, 0.04, 0.22], [0, 1.7, 0.33]);
    } else if (p.detalhe === "oculos") {
      caixa(g, "#0f172a", [0.42, 0.04, 0.02], [0, 1.47, 0.235], false);
    } else {
      caixa(g, "#dc2626", [0.1, 0.36, 0.02], [0, 0.82, 0.175], false);
      caixa(g, "#f8fafc", [0.26, 0.08, 0.02], [0, 1.16, 0.172], false);
    }
    scene.add(g);
    pessoas[p.chave] = {
      g,
      pernas,
      bracos,
      camisa,
      corPadrao: p.corPadrao,
      de: new THREE.Vector3(),
      para: new THREE.Vector3(Infinity, 0, Infinity),
      inicio: 0,
      dur: 1,
      fase: Math.random() * 10,
    };
  }

  const perto = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.abs(a.x - b.x) < 0.12 && Math.abs(a.z - b.z) < 0.12;
  /** Para onde a pessoa olha quando está parada em cada lugar. */
  function olhar(chave: Id, x: number, z: number): number {
    const minha = layout.mesas[chave];
    if (minha && perto({ x, z }, mundo(assentoDe(minha)))) return anguloAssento(minha);
    const analista = layout.agentes.find((a) => a.papel === "analista");
    const lado = mundo(ladoDoAnalista(layout));
    if (analista && perto({ x, z }, lado)) {
      const s = mundo(assentoDe(layout.mesas[analista.chave]));
      return Math.atan2(s.x - x, s.z - z); // virado para o analista
    }
    // diante de um móvel de trabalho: de frente para ele
    const diante: [{ x: number; y: number }, EstacaoId][] = [
      [pontoArquivo(layout), "arquivo"],
      [pontoQuadro(layout), "quadro"],
      [pontoCafe(layout), "cafe"],
      ...Array.from({ length: 10 }, (_, i) => [lugarNasLojas(layout, i), "lojas"] as [{ x: number; y: number }, EstacaoId]),
    ];
    for (const [ponto, id] of diante) {
      if (perto({ x, z }, mundo(ponto))) {
        const f = rotacionar(0, 1, layout.estacoes[id].rot);
        return Math.atan2(-f.x, -f.z);
      }
    }
    return 0;
  }
  /** Está sentado na própria mesa? */
  const naPropriaMesa = (chave: Id, p: T.Vector3) => {
    const m = layout.mesas[chave];
    return !!m && perto({ x: p.x, z: p.z }, mundo(assentoDe(m)));
  };

  function aplicarConfig(c: Config, novoLayout: Layout = layout) {
    layout = novoLayout;
    mParede.color.set(c.parede);
    mParedeLado.color.copy(escurecer(THREE, c.parede, 1.15));
    mDestaque.color.set(c.destaque);
    mMadeira.color.set(c.madeira);
    mMadeiraPe.color.copy(escurecer(THREE, c.madeira, 0.62));
    pintarPiso(c.piso);
    if (!arraste) {
      montarMoveis(c.itens);
      marcarDestinos();
      marcarSelecionado();
      if (enquadrarPronto) {
        calcularCantos(c.itens);
        enquadrar();
      }
    }
    for (const [chave, p] of Object.entries(pessoas)) p.camisa.color.set(c.uniformes[chave] ?? p.corPadrao);
  }
  let enquadrarPronto = false;
  aplicarConfig(configInicial);

  let falasAtuais: Falas = {};

  // ---- câmera: enquadra a sala inteira em qualquer proporção ----
  const cantos: T.Vector3[] = [];
  /** Cantos da área a enquadrar: a sala e os cômodos anexos para fora dela. */
  function calcularCantos(itens: Item[]) {
    const anexos = itens.filter((i) => CATALOGO_ITENS[i.tipo].comodo).map(pegada);
    const xMax = Math.max(xDireita + (edicao ? 6.5 : 0), ...anexos.map((r) => r.x2));
    const margem = edicao ? 6.5 : 0;
    const zMax = Math.max(zFrente + margem, ...anexos.map((r) => r.z2));
    cantos.length = 0;
    for (const x of [-10.6, xMax]) for (const y of [0, 3.2]) for (const z of [-4.6, zMax]) cantos.push(new THREE.Vector3(x, y, z));
  }
  calcularCantos(configInicial.itens);
  let largura = 1;
  let altura = 1;
  function enquadrar() {
    largura = el.clientWidth || 1;
    altura = el.clientHeight || 1;
    renderer.setSize(largura, altura, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.updateMatrixWorld();
    const v = new THREE.Vector3();
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const c of cantos) {
      v.copy(c).applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const aspecto = largura / altura;
    const meiaA = Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspecto) * 1.04;
    base = { cx, cy, meiaL: meiaA * aspecto, meiaA };
    aplicarCamera();
  }

  // ---- zoom e arrasto da câmera ----
  const ZOOM_MAX = 4;
  let base = { cx: 0, cy: 0, meiaL: 1, meiaA: 1 };
  let zoom = 1;
  const pan = { x: 0, y: 0 };
  function aplicarCamera() {
    const limX = base.meiaL * (1 - 1 / zoom);
    const limY = base.meiaA * (1 - 1 / zoom);
    pan.x = Math.max(-limX, Math.min(limX, pan.x));
    pan.y = Math.max(-limY, Math.min(limY, pan.y));
    const cx = base.cx + pan.x;
    const cy = base.cy + pan.y;
    Object.assign(camera, { left: cx - base.meiaL, right: cx + base.meiaL, top: cy + base.meiaA, bottom: cy - base.meiaA, zoom });
    camera.updateProjectionMatrix();
    renderer.domElement.style.touchAction = zoom > 1.01 || edicao ? "none" : "pan-y";
    renderer.domElement.style.cursor = edicao && colocando ? "crosshair" : edicao ? "move" : zoom > 1.01 ? "grab" : "default";
  }
  function definirZoom(z: number) {
    zoom = Math.max(1, Math.min(ZOOM_MAX, z));
    aplicarCamera();
  }

  enquadrar();
  enquadrarPronto = true;
  const ro = new ResizeObserver(enquadrar);
  ro.observe(el);

  const tela3d = renderer.domElement;
  const toques = new Map<number, { x: number; y: number }>();
  let pinca = 0;
  const distancia = () => {
    const [a, b] = [...toques.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  // ---- arrastar móveis (modo de edição) ----
  const raio = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pontoChao = new THREE.Vector3();
  function noChao(e: PointerEvent) {
    const r = tela3d.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ndc, camera);
    return raio.ray.intersectPlane(planoChao, pontoChao) ? pontoChao : null;
  }
  const grade = (v: number) => Math.round(v * 4) / 4;
  /** Cômodo que passou um pouco da borda aberta (direita/frente) gruda nela, virando anexo alinhado. */
  function ima(it: Item): Item {
    if (!CATALOGO_ITENS[it.tipo].comodo) return it;
    const p = pegada(it);
    const frente = frenteDaSala(layout);
    let { x, z, rot } = it;
    // fora da sala: a porta (lado +z local) vira para dentro do escritório
    if (x > layout.direita) rot = 3;
    else if (z > frente) rot = 2;
    if (rot !== it.rot) {
      const q = pegada({ ...it, rot });
      p.x1 = q.x1;
      p.z1 = q.z1;
    }
    if (p.x1 > layout.direita - 0.8 && p.x1 < layout.direita + 0.8) x += layout.direita - p.x1;
    if (p.z1 > frente - 0.8 && p.z1 < frente + 0.8) z += frente - p.z1;
    return { ...it, x, z, rot };
  }
  function atualizarFantasma(e: PointerEvent) {
    if (!colocando || !fantasma) return;
    const p = noChao(e);
    if (!p) return;
    let x = grade(p.x);
    let z = grade(p.z);
    if (CATALOGO_ITENS[colocando.tipo].parede) {
      ({ x, z } = naParede(p.x, p.z));
      if (x < -10) z = grade(z);
      else x = grade(x);
    }
    const item: Item = ima({ id: "novo", tipo: colocando.tipo, x, z, rot: colocando.rot });
    const r = verificarAlvo({ layout, itens: [...itensAtuais, item] }, "novo");
    candidato = { item, valido: r.ok, motivo: r.ok ? "" : r.motivo };
    posicionar(fantasma, item);
    fantasma.visible = true;
    marcar({ tipo: "item", item }, r.ok);
  }

  function aoApertar(e: PointerEvent) {
    if (edicao && colocando && toques.size === 0) {
      atualizarFantasma(e);
      if (candidato) {
        eventos.aoColocar(candidato.item.tipo, candidato.item.x, candidato.item.z, candidato.item.rot);
        if (!candidato.valido) eventos.aoRecusar(candidato.motivo);
      }
      return;
    }
    if (edicao && toques.size === 0) {
      const p = noChao(e);
      const acerto = raio.intersectObjects(gMoveis.children, true)[0];
      const alvo = alvoDe((acerto?.object.userData.alvo as string | undefined) ?? null);
      selecionado = alvo ? idDoAlvo(alvo) : null;
      eventos.aoSelecionar(selecionado);
      if (alvo && p) {
        const o = posDoAlvo(alvo);
        const sit = situacaoDo(alvo);
        arraste = { alvo, dx: o.x - p.x, dz: o.z - p.z, x: o.x, z: o.z, rot: o.rot, valido: sit.ok, motivo: sit.ok ? "" : sit.motivo };
        tela3d.setPointerCapture(e.pointerId);
        tela3d.style.cursor = "grabbing";
        marcar(alvo, sit.ok);
        return;
      }
      marcar(null);
    }
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 2) pinca = distancia();
    if (zoom > 1.01 || toques.size === 2) tela3d.setPointerCapture(e.pointerId);
    if (zoom > 1.01) tela3d.style.cursor = "grabbing";
  }
  function aoMover(e: PointerEvent) {
    if (edicao && colocando && !arraste && toques.size === 0) {
      atualizarFantasma(e);
      return;
    }
    if (arraste) {
      const p = noChao(e);
      if (!p) return;
      const a = arraste.alvo;
      const orig = posDoAlvo(a);
      let x = grade(p.x + arraste.dx);
      let z = grade(p.z + arraste.dz);
      let rot = orig.rot;
      const deParede = (a.tipo === "item" && CATALOGO_ITENS[a.item.tipo].parede) || (a.tipo === "estacao" && ESTACOES[a.id].parede);
      if (deParede) {
        ({ x, z } = naParede(p.x, p.z));
        if (x < -10) z = grade(z);
        else x = grade(x);
        if (a.tipo === "estacao") ({ x, z, rot } = quadroNaParede(x, z));
      } else if (a.tipo === "item") ({ x, z, rot } = ima({ ...a.item, x, z }));
      if (x === arraste.x && z === arraste.z && rot === arraste.rot) return;
      arraste.x = x;
      arraste.z = z;
      arraste.rot = rot;
      const movido = alvoEm(a, x, z, rot);
      const r = situacaoDo(movido);
      arraste.valido = r.ok;
      arraste.motivo = r.ok ? "" : r.motivo;
      const g = objetos.get(idDoAlvo(a));
      if (g && movido.tipo === "item") posicionar(g, movido.item);
      else if (g && movido.tipo === "mesa") posicionarMesa(g, movido.mesa);
      else if (g && movido.tipo === "estacao") {
        posicionarEstacao(g, movido.est);
        if (movido.id === "quadro") posicionarEstacao(bilhetes, movido.est);
      }
      marcar(movido, r.ok);
      return;
    }
    const antes = toques.get(e.pointerId);
    if (!antes) return;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 2) {
      const d = distancia();
      if (pinca > 0) definirZoom(zoom * (d / pinca));
      pinca = d;
      return;
    }
    if (zoom <= 1.01) return;
    pan.x -= ((e.clientX - antes.x) / largura) * ((2 * base.meiaL) / zoom);
    pan.y += ((e.clientY - antes.y) / altura) * ((2 * base.meiaA) / zoom);
    aplicarCamera();
  }
  function aoSoltar(e: PointerEvent) {
    if (arraste) {
      const { alvo, x, z, rot, valido, motivo } = arraste;
      arraste = null;
      aplicarCamera();
      const id = idDoAlvo(alvo);
      const { x: ox, z: oz, rot: orot } = posDoAlvo(alvo);
      // edição livre: o que for solto fica onde foi solto; o que estiver errado só impede de salvar
      if (x !== ox || z !== oz || rot !== orot) eventos.aoSoltar(id, x, z, rot);
      if (!valido) eventos.aoRecusar(motivo);
      return;
    }
    toques.delete(e.pointerId);
    if (toques.size < 2) pinca = 0;
    aplicarCamera();
  }
  function aoRolar(e: WheelEvent) {
    // fora da tela cheia, só com Ctrl, para não atrapalhar a rolagem da página
    if (!document.fullscreenElement && !e.ctrlKey) return;
    e.preventDefault();
    definirZoom(zoom * Math.exp(-e.deltaY * 0.0015));
  }
  tela3d.addEventListener("pointerdown", aoApertar);
  tela3d.addEventListener("pointermove", aoMover);
  tela3d.addEventListener("pointerup", aoSoltar);
  tela3d.addEventListener("pointercancel", aoSoltar);
  tela3d.addEventListener("wheel", aoRolar, { passive: false });
  const aoSair = () => {
    if (fantasma) fantasma.visible = false;
    if (colocando) marcarSelecionado();
  };
  tela3d.addEventListener("pointerleave", aoSair);

  let visivel = true;
  const io = new IntersectionObserver(([e]) => (visivel = e.isIntersecting));
  io.observe(el);

  // ---- laço de animação ----
  const v = new THREE.Vector3();
  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let anterior = performance.now();
  let quadro = 0;

  function projetar(x: number, y: number, z: number) {
    v.set(x, y, z).project(camera);
    return { sx: (v.x * 0.5 + 0.5) * largura, sy: (-v.y * 0.5 + 0.5) * altura };
  }

  function laco(t: number) {
    quadro = requestAnimationFrame(laco);
    const dt = Math.min((t - anterior) / 1000, 0.1);
    anterior = t;
    if (!visivel) return;

    for (const [chave, a] of Object.entries(pessoas)) {
      const k = Math.min(1, Math.max(0, (t - a.inicio) / a.dur));
      a.g.position.lerpVectors(a.de, a.para, k);
      const andando = k < 1 && a.de.distanceToSquared(a.para) > 1e-4;

      const alvo = andando ? Math.atan2(a.para.x - a.de.x, a.para.z - a.de.z) : olhar(chave, a.para.x, a.para.z);
      let diff = alvo - a.g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      a.g.rotation.y += diff * Math.min(1, dt * 10);

      const passo = andando && !reduzir ? Math.sin(t * 0.013 + a.fase) * 0.75 : 0;
      a.g.position.y = andando && !reduzir ? Math.abs(Math.sin(t * 0.013 + a.fase)) * 0.06 : 0;
      a.pernas[0].rotation.x = passo;
      a.pernas[1].rotation.x = -passo;

      const naMesa = !andando && naPropriaMesa(chave, a.para);
      const noCafe = !andando && perto({ x: a.para.x, z: a.para.z }, mundo(pontoCafe(layout)));
      const fala = falasAtuais[chave];
      if (naMesa && fala && !reduzir) {
        // digitando
        a.bracos[0].rotation.x = -0.9 + Math.sin(t * 0.03) * 0.12;
        a.bracos[1].rotation.x = -0.9 + Math.cos(t * 0.03) * 0.12;
      } else if (noCafe && fala) {
        a.bracos[0].rotation.x = 0;
        a.bracos[1].rotation.x = -2.1; // xícara na boca
      } else {
        a.bracos[0].rotation.x = -passo * 0.8;
        a.bracos[1].rotation.x = passo * 0.8;
      }

      const bolha = bolhas[chave];
      if (bolha) {
        const { sx, sy } = projetar(a.g.position.x, 2.05, a.g.position.z);
        const meia = bolha.offsetWidth / 2;
        const x = Math.min(Math.max(sx, meia + 4), largura - meia - 4);
        bolha.style.transform = `translate(${Math.round(x - meia)}px, ${Math.round(sy - bolha.offsetHeight)}px)`;
      }
    }

    ROTULOS.forEach((r, i) => {
      const s = rotulos[i];
      if (!s) return;
      const e = r.est ? layout.estacoes[r.est] : null;
      const { sx, sy } = projetar(e ? e.x : r.x!, r.y, e ? e.z : r.z!);
      s.style.transform = `translate(${Math.round(sx - s.offsetWidth / 2)}px, ${Math.round(sy)}px)`;
    });

    renderer.render(scene, camera);
  }
  quadro = requestAnimationFrame(laco);
  const fotos = setTimeout(() => eventos.aoMiniaturas(gerarMiniaturas()), 400);

  return {
    aplicar(vis) {
      const agora = performance.now();
      for (const [chave, a] of Object.entries(pessoas)) {
        const alvo = vis[chave];
        if (!alvo) continue;
        const w = mundo(alvo);
        if (Math.abs(a.para.x - w.x) < 1e-3 && Math.abs(a.para.z - w.z) < 1e-3) continue;
        const primeira = !Number.isFinite(a.para.x);
        a.de.copy(primeira ? new THREE.Vector3(w.x, 0, w.z) : a.g.position).setY(0);
        a.para.set(w.x, 0, w.z);
        a.inicio = agora;
        a.dur = primeira ? 1 : Math.max(alvo.dur, 1);
        if (primeira) a.g.rotation.y = olhar(chave, w.x, w.z);
      }
    },
    notas(n) {
      bilhetes.clear();
      for (let i = 0; i < Math.min(n, 6); i++) {
        const b = caixa(bilhetes, "#fde68a", [0.5, 0.55, 0.02], [-1.55 + i * 0.62, 1.55, -4.18], false);
        b.rotation.z = i % 2 ? 0.06 : -0.06;
      }
    },
    falas(f) {
      falasAtuais = f;
    },
    config: aplicarConfig,
    edicao(ligar, sel) {
      edicao = ligar;
      selecionado = sel;
      gDestinos.visible = ligar;
      if (enquadrarPronto) {
        calcularCantos(itensAtuais);
        enquadrar();
      }
      aplicarCamera();
      montarContornos();
      if (!arraste) marcarSelecionado();
    },
    colocar(c) {
      colocando = c;
      if (!c) limparFantasma();
      else montarFantasma(c.tipo);
      aplicarCamera();
    },
    zoom(fator) {
      if (fator === 0) {
        pan.x = pan.y = 0;
        definirZoom(1);
      } else definirZoom(zoom * fator);
    },
    destruir() {
      cancelAnimationFrame(quadro);
      clearTimeout(fotos);
      tela3d.removeEventListener("pointerdown", aoApertar);
      tela3d.removeEventListener("pointermove", aoMover);
      tela3d.removeEventListener("pointerup", aoSoltar);
      tela3d.removeEventListener("pointercancel", aoSoltar);
      tela3d.removeEventListener("wheel", aoRolar);
      tela3d.removeEventListener("pointerleave", aoSair);
      limparFantasma();
      ro.disconnect();
      io.disconnect();
      unidade.dispose();
      geoVaso.dispose();
      geoFolhas.dispose();
      geoAnel.dispose();
      materiais.forEach((m) => m.dispose());
      textura.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function Escritorio3D({
  layout,
  config,
  vis,
  falas,
  notas,
  relogio,
  etiquetas,
  editando = false,
  selecionado = null,
  aoSelecionar,
  aoMover,
  aoRecusar,
  colocando = null,
  aoColocar,
  aoMiniaturas,
}: {
  layout: Layout;
  config: Config;
  vis: Record<Id, Vis>;
  falas: Falas;
  notas: number;
  relogio: string;
  /** texto extra sob o nome (ex.: tempo restante do contrato) */
  etiquetas?: Partial<Record<Id, string>>;
  editando?: boolean;
  selecionado?: string | null;
  aoSelecionar?: (id: string | null) => void;
  /** item (id) ou mesa ("mesa:<chave>") solto num lugar válido */
  aoMover?: (id: string, x: number, z: number, rot: number) => void;
  aoRecusar?: (motivo: string) => void;
  colocando?: Colocando;
  aoColocar?: (tipo: TipoItem, x: number, z: number, rot: number) => void;
  aoMiniaturas?: (fotos: Record<string, string>) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const bolhas = useRef<Record<Id, HTMLDivElement | null>>({});
  const rotulos = useRef<(HTMLSpanElement | null)[]>([]);
  const motor = useRef<Motor | null>(null);
  const ultimo = useRef({ vis, falas, notas, config, layout, editando, selecionado, colocando });
  const avisos = useRef({ aoSelecionar, aoMover, aoRecusar, aoColocar, aoMiniaturas });
  const [situacao, setSituacao] = useState<"carregando" | "pronto" | "falhou">("carregando");

  useEffect(() => {
    avisos.current = { aoSelecionar, aoMover, aoRecusar, aoColocar, aoMiniaturas };
  });

  // a cena é montada uma vez por equipe/tamanho de sala; quando isso muda, o componente pai troca a `key`
  useEffect(() => {
    let ativo = true;
    import("three")
      .then((THREE) => {
        if (!ativo || !caixa.current) return;
        const u = ultimo.current;
        const m = montar(THREE, caixa.current, bolhas.current, rotulos.current, u.layout, u.config, {
          aoSelecionar: (id) => avisos.current.aoSelecionar?.(id),
          aoSoltar: (id, x, z, rot) => avisos.current.aoMover?.(id, x, z, rot),
          aoRecusar: (motivo) => avisos.current.aoRecusar?.(motivo),
          aoColocar: (tipo, x, z, rot) => avisos.current.aoColocar?.(tipo, x, z, rot),
          aoMiniaturas: (f) => avisos.current.aoMiniaturas?.(f),
        });
        motor.current = m;
        m.aplicar(u.vis);
        m.falas(u.falas);
        m.notas(u.notas);
        m.edicao(u.editando, u.selecionado);
        m.colocar(u.colocando);
        setSituacao("pronto");
      })
      .catch(() => {
        if (ativo) setSituacao("falhou");
      });
    return () => {
      ativo = false;
      motor.current?.destruir();
      motor.current = null;
    };
  }, []);

  useEffect(() => {
    ultimo.current.vis = vis;
    motor.current?.aplicar(vis);
  }, [vis]);

  useEffect(() => {
    ultimo.current.falas = falas;
    motor.current?.falas(falas);
  }, [falas]);

  useEffect(() => {
    ultimo.current.notas = notas;
    motor.current?.notas(notas);
  }, [notas]);

  useEffect(() => {
    ultimo.current.editando = editando;
    ultimo.current.selecionado = selecionado;
    motor.current?.edicao(editando, selecionado);
  }, [editando, selecionado]);

  useEffect(() => {
    ultimo.current.colocando = colocando;
    motor.current?.colocar(colocando);
  }, [colocando]);

  useEffect(() => {
    ultimo.current.config = config;
    ultimo.current.layout = layout;
    motor.current?.config(config, layout);
  }, [config, layout]);

  return (
    <div
      ref={caixa}
      data-escritorio-3d
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-[#dfe6fb] shadow-sm"
      role="img"
      aria-label={`Escritório em 3D com ${layout.agentes.length} funcionários`}
    >
      {situacao !== "pronto" && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted">
          {situacao === "carregando" ? "Montando o escritório..." : "Seu navegador não conseguiu abrir a visão em 3D."}
        </p>
      )}
      {situacao === "pronto" && (
        <div className="absolute bottom-2 right-2 z-20 flex overflow-hidden rounded-lg border border-white/20 bg-brand/85 text-white shadow-lg backdrop-blur">
          {[
            { rotulo: "Aproximar", texto: "+", fator: 1.4 },
            { rotulo: "Afastar", texto: "−", fator: 1 / 1.4 },
            { rotulo: "Ver o escritório inteiro", texto: "⤢", fator: 0 },
          ].map((b) => (
            <button
              key={b.rotulo}
              type="button"
              title={b.rotulo}
              aria-label={b.rotulo}
              onClick={() => motor.current?.zoom(b.fator)}
              className="grid h-9 w-9 place-items-center text-lg leading-none transition hover:bg-white/15"
            >
              {b.texto}
            </button>
          ))}
        </div>
      )}
      {situacao === "pronto" && (
        <p className="pointer-events-none absolute bottom-2 left-2 z-20 hidden rounded bg-brand/70 px-2 py-1 text-[10px] text-slate-200 sm:block">
          {editando && colocando
            ? "Clique no lugar onde quer colocar · R gira · Esc cancela"
            : editando
            ? "Arraste mesas e itens · círculos verdes: lugares que precisam ficar acessíveis"
            : "Zoom: botões, pinça ou Ctrl + roda do mouse · arraste para mover"}
        </p>
      )}
      {ROTULOS.map((r, i) => (
        <span
          key={r.texto}
          ref={(n) => {
            rotulos.current[i] = n;
          }}
          className={`pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
            r.texto === "relogio" ? "bg-brand text-white ring-1 ring-accent-light" : "bg-white/85 text-slate-600"
          } ${situacao === "pronto" && (r.texto !== "relogio" || relogio) ? "" : "invisible"}`}
        >
          {r.texto === "relogio" ? relogio : r.texto}
        </span>
      ))}
      {layout.agentes.map((p) => (
        <div
          key={p.chave}
          ref={(n) => {
            bolhas.current[p.chave] = n;
          }}
          className={`pointer-events-none absolute left-0 top-0 flex flex-col items-center gap-1 ${situacao === "pronto" ? "" : "invisible"}`}
        >
          {falas[p.chave] && (
            <div className="w-max max-w-32 rounded-lg border border-line bg-white px-2 py-1 text-center text-[10px] leading-tight text-fg shadow sm:max-w-48 sm:text-xs">
              {falas[p.chave]}
            </div>
          )}
          <span className="whitespace-nowrap rounded bg-brand/80 px-1.5 text-[9px] font-medium text-white sm:text-[10px]">{p.nome}</span>
          {etiquetas?.[p.chave] && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-300 px-1.5 text-[9px] font-semibold text-amber-950 shadow sm:text-[10px]">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="8" cy="9" r="6" />
                <path d="M8 6v3l2 1M6 1h4" />
              </svg>
              {etiquetas[p.chave]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
