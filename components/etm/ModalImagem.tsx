"use client";

import { useEffect, useRef, useState } from "react";

const CORES = [
  { nome: "Vermelho", valor: "#ef4444" },
  { nome: "Amarelo", valor: "#facc15" },
  { nome: "Azul", valor: "#2563eb" },
  { nome: "Verde", valor: "#16a34a" },
  { nome: "Preto", valor: "#111827" },
  { nome: "Branco", valor: "#ffffff" },
];

// espessura em pixels na tela; no arquivo ela é proporcional ao tamanho da imagem
const ESPESSURAS = [
  { nome: "Fina", valor: 3, ponto: "h-1.5 w-1.5" },
  { nome: "Média", valor: 6, ponto: "h-2.5 w-2.5" },
  { nome: "Grossa", valor: 12, ponto: "h-4 w-4" },
];

// fotos de celular chegam a 4000 px ou mais: a marcação é feita em até 2560 px no lado maior
const LADO_MAX = 2560;

type Ponto = { x: number; y: number };
type Traco = { cor: string; largura: number; pontos: Ponto[] };

function desenharTraco(ctx: CanvasRenderingContext2D, t: Traco) {
  ctx.strokeStyle = t.cor;
  ctx.fillStyle = t.cor;
  ctx.lineWidth = t.largura;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (t.pontos.length === 1) {
    ctx.beginPath();
    ctx.arc(t.pontos[0].x, t.pontos[0].y, t.largura / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(t.pontos[0].x, t.pontos[0].y);
  for (const p of t.pontos.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

type Props = {
  arquivo: File;
  modoInicial: "ver" | "marcar";
  onFechar: () => void;
  /** Sem isto o modal só mostra a imagem (usado nas cópias já marcadas). */
  onMarcada?: (marcada: File) => void;
};

/** Mostra a imagem em tela grande e, se permitido, deixa desenhar por cima com caneta (mouse, dedo ou caneta). */
export default function ModalImagem({ arquivo, modoInicial, onFechar, onMarcada }: Props) {
  const [modo, setModo] = useState(modoInicial);
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [cor, setCor] = useState(CORES[0].valor);
  const [espessura, setEspessura] = useState(ESPESSURAS[1].valor);
  const [qtd, setQtd] = useState(0);
  const [erro, setErro] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const tracos = useRef<Traco[]>([]);
  const atual = useRef<Traco | null>(null);

  useEffect(() => {
    // "ativo" evita avisos falsos quando o React refaz o efeito (o endereço antigo já foi liberado)
    let ativo = true;
    const u = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => ativo && setImagem(img);
    img.onerror = () => ativo && setErro("Não foi possível abrir esta imagem.");
    img.src = u;
    return () => {
      ativo = false;
      URL.revokeObjectURL(u);
    };
  }, [arquivo]);

  function pedirFechar() {
    if (qtd > 0 && !window.confirm("Descartar a marcação que você fez?")) return;
    onFechar();
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (qtd > 0 && !window.confirm("Descartar a marcação que você fez?")) return;
      onFechar();
    };
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [qtd, onFechar]);

  function redesenhar() {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !imagem) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(imagem, 0, 0, c.width, c.height);
    for (const t of tracos.current) desenharTraco(ctx, t);
  }

  // ao entrar no modo de marcar, o desenho ganha o tamanho da imagem (limitado) e mostra os traços já feitos
  useEffect(() => {
    const c = canvas.current;
    if (modo !== "marcar" || !c || !imagem) return;
    const k = Math.min(1, LADO_MAX / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    c.width = Math.round(imagem.naturalWidth * k);
    c.height = Math.round(imagem.naturalHeight * k);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(imagem, 0, 0, c.width, c.height);
    for (const t of tracos.current) desenharTraco(ctx, t);
  }, [modo, imagem]);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>): Ponto {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  function comecar(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    c.setPointerCapture(e.pointerId);
    setErro("");
    const escala = c.width / c.getBoundingClientRect().width;
    atual.current = { cor, largura: espessura * escala, pontos: [posicao(e)] };
    const ctx = c.getContext("2d");
    if (ctx) desenharTraco(ctx, atual.current);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    const t = atual.current;
    const ctx = e.currentTarget.getContext("2d");
    if (!t || !ctx) return;
    const anterior = t.pontos[t.pontos.length - 1];
    const p = posicao(e);
    t.pontos.push(p);
    ctx.strokeStyle = t.cor;
    ctx.lineWidth = t.largura;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(anterior.x, anterior.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function terminar() {
    if (!atual.current) return;
    tracos.current.push(atual.current);
    atual.current = null;
    setQtd(tracos.current.length);
  }

  function desfazer() {
    tracos.current.pop();
    setQtd(tracos.current.length);
    redesenhar();
  }

  function limpar() {
    tracos.current = [];
    setQtd(0);
    redesenhar();
  }

  function salvar() {
    const c = canvas.current;
    if (!c || !onMarcada) return;
    if (tracos.current.length === 0) return setErro("Desenhe algo na imagem antes de salvar.");
    c.toBlob(
      (blob) => {
        if (!blob) return setErro("Não foi possível gerar a imagem marcada.");
        const base = arquivo.name.replace(/\.[^.]+$/, "");
        onMarcada(new File([blob], `${base}-marcada.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  const botao = "rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modo === "marcar" ? "Marcar imagem" : "Visualizar imagem"}
      className="fixed inset-0 z-[90] flex flex-col gap-3 bg-[#050f3d]/95 p-3 sm:p-6"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-white">
          {modo === "marcar" ? "Marcar imagem · " : ""}
          {arquivo.name}
        </p>
        <div className="flex gap-2">
          {modo === "ver" && onMarcada && (
            <button type="button" onClick={() => setModo("marcar")} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#050f3d] hover:bg-blue-100">
              Marcar com caneta
            </button>
          )}
          {modo === "marcar" && (
            <button type="button" onClick={() => setModo("ver")} className={botao}>
              Ver sem marcar
            </button>
          )}
          <button type="button" onClick={pedirFechar} className={botao}>
            Fechar
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        {!imagem && !erro && <span aria-hidden className="h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-cyan-200" />}
        {modo === "ver" && imagem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem.src} alt={arquivo.name} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        )}
        {modo === "marcar" && imagem && (
          <canvas
            ref={canvas}
            onPointerDown={comecar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerCancel={terminar}
            className="max-h-[calc(100dvh-11rem)] max-w-full cursor-crosshair touch-none rounded-lg bg-white shadow-2xl"
          />
        )}
      </div>

      {modo === "marcar" && (
        <div className="flex shrink-0 flex-col gap-3">
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-xl bg-white/10 px-4 py-3">
            <div className="flex items-center gap-2" role="group" aria-label="Cor da caneta">
              {CORES.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  title={c.nome}
                  aria-label={c.nome}
                  aria-pressed={cor === c.valor}
                  onClick={() => setCor(c.valor)}
                  style={{ backgroundColor: c.valor }}
                  className={`h-7 w-7 rounded-full border-2 transition ${cor === c.valor ? "scale-110 border-cyan-200 ring-2 ring-white" : "border-white/40"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Espessura da caneta">
              {ESPESSURAS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  title={e.nome}
                  aria-label={e.nome}
                  aria-pressed={espessura === e.valor}
                  onClick={() => setEspessura(e.valor)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${espessura === e.valor ? "bg-white" : "bg-white/15 hover:bg-white/25"}`}
                >
                  <span className={`${e.ponto} rounded-full ${espessura === e.valor ? "bg-[#050f3d]" : "bg-white"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={desfazer} disabled={qtd === 0} className={botao}>
                Desfazer
              </button>
              <button type="button" onClick={limpar} disabled={qtd === 0} className={botao}>
                Limpar
              </button>
            </div>
            <button type="button" onClick={salvar} className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-400">
              Salvar marcação
            </button>
          </div>
          <p className="text-center text-xs text-blue-100">
            Ao salvar, o pedido leva duas imagens: a original e a marcada.
          </p>
        </div>
      )}
    </div>
  );
}
