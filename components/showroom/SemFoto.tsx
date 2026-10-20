/** Quadro neutro para veículo cadastrado sem foto. */
export default function SemFoto({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-slate-200 text-slate-500 ${className}`}
      role="img"
      aria-label="Foto em breve"
    >
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 8h3l2-3h8l2 3h3v11H3z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Foto em breve</span>
    </div>
  );
}
