import Image from "next/image";
import Link from "next/link";
import { seriesDoPainel } from "@/lib/series-videos";
import type { Serie } from "@/lib/series";
import AnimatedCard from "@/components/AnimatedCard";

function Selo({ n }: { n: number }) {
  return (
    <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
        <path d="M6 4l14 8-14 8z" />
      </svg>
      {n} {n === 1 ? "episódio" : "episódios"}
    </span>
  );
}

/** Série em destaque: ocupa duas colunas, com selo "Nova série" e as datas de estreia. */
function CartaoDestaque({ s }: { s: Serie }) {
  const eps = s.episodios;
  const dia = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }) : null;
  const datas = eps.map((e) => e.quando).filter((q): q is string => !!q).sort();
  const ini = dia(datas[0]);
  const fim = dia(datas[datas.length - 1]);
  return (
    <Link
      href={`/vida-de-dono/${s.slug}`}
      data-track={`serie:${s.slug}`}
      className="card card-hover group grid overflow-hidden border-accent-light/50 shadow-2xl shadow-accent/30 ring-1 ring-accent-light/30 md:grid-cols-[1.45fr_1fr]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-brand">
        <Image
          src={s.capa}
          alt={`Capa da série ${s.titulo}`}
          fill
          sizes="(min-width:1024px) 700px, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#ffe14d] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-brand shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          Nova série
        </span>
        <Selo n={eps.length} />
      </div>
      <div className="flex flex-col justify-center p-7 md:p-8">
        {ini && fim && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">
            {s.agenda ?? (ini === fim ? `Estreia ${ini}` : `Estreia ${ini} · último episódio em ${fim}`)}
          </p>
        )}
        <h3 className="mb-3 text-3xl font-bold tracking-tight text-fg">{s.titulo}</h3>
        <p className="text-base leading-relaxed text-muted">{s.chamada}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Planilha que trava, estagiário que apaga tudo, ameaças de demissão e o TI que previu cada passo.
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
          Ver episódios
          <span aria-hidden className="transition group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

function CartaoSerie({ s }: { s: Serie }) {
  return (
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
        <Selo n={s.episodios.length} />
      </div>
      <div className="p-6">
        {s.agenda && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">{s.agenda}</p>
        )}
        <h3 className="mb-2 text-xl font-semibold text-fg">{s.titulo}</h3>
        <p className="text-sm leading-relaxed text-muted">{s.chamada}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
          Ver episódios
          <span aria-hidden className="transition group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

/** Seção da home com um cartão por série (a série em destaque vem primeiro). */
export default async function SecaoSeries() {
  const todas = await seriesDoPainel();
  if (todas.length === 0) return null;
  const ordenadas = [...todas].sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque));
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

        <div className="grid gap-6 lg:grid-cols-3">
          {ordenadas.map((s, i) => (
            <AnimatedCard key={s.slug} delay={i * 120} className={s.destaque ? "lg:col-span-3" : ""}>
              {s.destaque ? <CartaoDestaque s={s} /> : <CartaoSerie s={s} />}
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
