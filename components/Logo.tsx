/**
 * Logo: monograma "IA" + nome, na mesma fonte do resto do site.
 * As letras do monograma são caminhos desenhados no estilo da fonte (sans
 * geométrica em negrito), para ficarem idênticas ao favicon e não
 * dependerem do carregamento de nenhuma fonte.
 */
export function Monograma({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-gradiente" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#0a3bd1" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-gradiente)" />
      <g fill="#fff">
        {/* I */}
        <rect x="9.5" y="11" width="4.6" height="18" rx="0.8" />
        {/* A (com o vão do meio vazado) */}
        <path
          fillRule="evenodd"
          d="M16.6 29L22.6 11H27L33 29H28.4L27.4 25.7H22.2L21.2 29ZM23.3 22.4H26.3L24.8 17.3Z"
        />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-3">
      <Monograma />
      <span className="text-[19px] font-semibold tracking-[-0.025em] text-white">
        Igor Arthur
      </span>
    </span>
  );
}
