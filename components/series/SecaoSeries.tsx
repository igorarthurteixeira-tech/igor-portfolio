import Image from "next/image";
import Link from "next/link";
import { series } from "@/lib/series";
import AnimatedCard from "@/components/AnimatedCard";

/** Balões decorativos (só quando sobra espaço ao lado dos cartões). */
const baloes = [
  { texto: "qual é a versão certa?", classe: "right-[8%] top-[14%] -rotate-3", anim: "hero-flutua-a", verde: false },
  { texto: "cadê o pedido do João?", classe: "right-[2%] top-[34%] rotate-2", anim: "hero-flutua-b", verde: true },
  { texto: "BETO.", classe: "right-[22%] top-[52%] -rotate-2", anim: "hero-flutua-c", verde: true },
  { texto: "kkkkk qual senha", classe: "right-[6%] top-[70%] rotate-3", anim: "hero-flutua-a", verde: false },
];

/** Seção da home com um cartão por série. */
export default function SecaoSeries() {
  return (
    <section
      id="vida-de-dono"
      className="relative overflow-hidden border-b border-accent/40 bg-brand px-6 py-20 md:py-28"
    >
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-accent/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent-light/20 blur-[130px]"
      />

      {series.length < 3 && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block">
          {baloes.map((b) => (
            <div key={b.texto} className={`absolute ${b.classe}`}>
              <div className={b.anim}>
                <span
                  className={`block rounded-2xl border px-5 py-3 text-base font-medium backdrop-blur-sm ${
                    b.verde
                      ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                      : "border-white/15 bg-white/10 text-slate-200"
                  }`}
                >
                  {b.texto}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow-dark">Séries de ficção</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Vida de <span className="text-gradient">Dono</span>
          </h2>
          <p className="text-lg leading-relaxed text-slate-300">
            Histórias inventadas sobre problemas reais de quem toca um negócio. Para dar risada e,
            quem sabe, se reconhecer.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s, i) => (
            <AnimatedCard key={s.slug} delay={i * 120}>
              <Link
                href={`/vida-de-dono/${s.slug}`}
                data-track={`serie:${s.slug}`}
                className="card card-hover group block overflow-hidden border-white/15 shadow-2xl shadow-black/40"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-brand">
                  <Image
                    src={s.capa}
                    alt={`Capa da série ${s.titulo}`}
                    fill
                    sizes="(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                      <path d="M6 4l14 8-14 8z" />
                    </svg>
                    {s.episodios.length} {s.episodios.length === 1 ? "episódio" : "episódios"}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-semibold text-fg">{s.titulo}</h3>
                  <p className="text-sm leading-relaxed text-muted">{s.chamada}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                    Ver episódios
                    <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
