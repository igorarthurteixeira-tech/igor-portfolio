/** Marca da concessionária fictícia: Vértice Motors (desenhada do zero). */
export function Emblema({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="3" fill="#c8102e" />
      <path d="M8 11 H15 L20 25 L25 11 H32 L22.5 31 H17.5 Z" fill="#fff" />
    </svg>
  );
}

export default function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Emblema />
      <span
        className={`leading-none ${claro ? "text-white" : "text-fg"}`}
        style={{ fontFamily: "var(--font-oswald), sans-serif" }}
      >
        <span className="block text-xl font-semibold uppercase tracking-[0.12em]">Vértice</span>
        <span className={`block text-[10px] font-medium uppercase tracking-[0.5em] ${claro ? "text-slate-400" : "text-slate-500"}`}>
          Motors
        </span>
      </span>
    </span>
  );
}
