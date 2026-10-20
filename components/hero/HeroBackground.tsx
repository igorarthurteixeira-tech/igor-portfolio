"use client";

import { useEffect, useRef } from "react";

type Particula = { x: number; y: number; vx: number; vy: number; r: number };

/**
 * Rede de partículas que reage ao ponteiro. Leve de propósito:
 * poucas partículas, pausa quando a aba ou a hero saem da tela e
 * desenha só um quadro parado se o usuário pediu menos movimento.
 */
export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let particulas: Particula[] = [];
    const mouse = { x: -9999, y: -9999 };
    let visivel = true;
    let raf = 0;

    function medir() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(80, Math.max(28, (w * h) / 22000)));
      particulas = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
      }));
    }

    const LIGACAO = 130;
    const RAIO_MOUSE = 170;

    function quadro() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particulas) {
        if (!reduzir) {
          p.x += p.vx;
          p.y += p.vy;
          // afasta levemente do ponteiro
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < RAIO_MOUSE * RAIO_MOUSE && d2 > 1) {
            const f = (1 - Math.sqrt(d2) / RAIO_MOUSE) * 0.9;
            p.x += (dx / Math.sqrt(d2)) * f;
            p.y += (dy / Math.sqrt(d2)) * f;
          }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
        }
      }
      for (let i = 0; i < particulas.length; i++) {
        const a = particulas[i];
        for (let j = i + 1; j < particulas.length; j++) {
          const b = particulas[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LIGACAO) {
            ctx!.strokeStyle = `rgba(96,165,250,${(1 - d / LIGACAO) * 0.35})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
        // linhas até o ponteiro
        const mx = a.x - mouse.x;
        const my = a.y - mouse.y;
        const md = Math.sqrt(mx * mx + my * my);
        if (md < RAIO_MOUSE) {
          ctx!.strokeStyle = `rgba(34,211,238,${(1 - md / RAIO_MOUSE) * 0.55})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(mouse.x, mouse.y);
          ctx!.stroke();
        }
      }
      for (const p of particulas) {
        ctx!.fillStyle = "rgba(191,219,254,0.85)";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function laco() {
      if (visivel && !document.hidden) quadro();
      raf = requestAnimationFrame(laco);
    }

    function aoMover(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    const aoSair = () => {
      mouse.x = mouse.y = -9999;
    };

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visivel = e.isIntersecting), {
      threshold: 0,
    });
    io.observe(canvas);
    window.addEventListener("pointermove", aoMover, { passive: true });
    document.addEventListener("pointerleave", aoSair);

    if (reduzir) quadro();
    else raf = requestAnimationFrame(laco);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerleave", aoSair);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
