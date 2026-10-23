import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acharSerie, series } from "@/lib/series";
import { serieDoPainel } from "@/lib/series-videos";
import ListaEpisodios from "@/components/series/ListaEpisodios";

// Os vídeos vêm do painel de Publicações: a página se atualiza sozinha a cada 5 minutos.
export const revalidate = 300;

export function generateStaticParams() {
  return series.map((s) => ({ serie: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serie: string }>;
}): Promise<Metadata> {
  const { serie: slug } = await params;
  const serie = acharSerie(slug);
  if (!serie) return {};
  return {
    title: `${serie.titulo} · Vida de Dono`,
    description: serie.descricao,
    alternates: { canonical: `/vida-de-dono/${serie.slug}` },
  };
}

export default async function SeriePage({
  params,
}: {
  params: Promise<{ serie: string }>;
}) {
  const { serie: slug } = await params;
  const serie = await serieDoPainel(slug);
  if (!serie) notFound();

  return (
    <>
      <section className="relative overflow-hidden bg-brand px-6 pb-14 pt-20">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[110px]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-6">
            <Link
              href="/#vida-de-dono"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              <span aria-hidden>←</span> Vida de Dono
            </Link>
          </div>
          <p className="eyebrow-dark">Série de ficção</p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {serie.titulo}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            {serie.descricao}
          </p>
          <p className="mt-4 inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-slate-100">
            História fictícia. Os personagens são inventados, os problemas são reais.
          </p>
        </div>
      </section>

      <section className="min-h-[50vh] bg-page px-6 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="section-title mb-8">Episódios</h2>
          <ListaEpisodios serie={serie} />

          <div className="mt-16 rounded-2xl bg-brand p-8 text-center sm:p-10">
            <p className="text-2xl font-bold tracking-tight text-white">
              Seu negócio também vive uma dessas?
            </p>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Eu desenvolvo sistemas sob medida. Você testa antes de pagar.
            </p>
            <Link href="/#como-contratar" className="btn-primary mt-6">
              Ver como funciona
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
