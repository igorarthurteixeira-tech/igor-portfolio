import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { series } from "@/lib/series";
import { serieDoPainel } from "@/lib/series-videos";
import ListaEpisodios from "@/components/series/ListaEpisodios";
import CapaAnimada from "@/components/series/CapaAnimada";

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
  const serie = await serieDoPainel(slug);
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
    <div className="bg-page">
      {/* topo: a arte da série (sem o texto da capa) à direita, com o título vivo por cima */}
      <section className="relative isolate overflow-hidden bg-brand px-6 pb-32 pt-20 [clip-path:polygon(0_0,100%_0,100%_calc(100%-4rem),0_100%)]">
        {serie.chat && (
          <div className="absolute inset-y-0 -right-10 -z-10 hidden items-center lg:flex [mask-image:linear-gradient(to_right,transparent_2%,black_38%)]">
            <CapaAnimada chat={serie.chat} />
          </div>
        )}
        <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-[120px]" />
        <div aria-hidden className="absolute -right-24 top-10 -z-10 h-96 w-96 rounded-full bg-accent-light/25 blur-[130px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-6">
            <Link
              href="/#vida-de-dono"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              <span aria-hidden>←</span> Séries
            </Link>
          </div>
          <p className="eyebrow-dark">Série de ficção</p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">{serie.titulo}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200">{serie.descricao}</p>
          {serie.agenda && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ffe14d] px-4 py-1.5 text-sm font-extrabold uppercase tracking-[0.12em] text-brand shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              {serie.agenda}
            </p>
          )}
        </div>
      </section>

      {/* lista: fundo claro com grade e brilhos suaves, em vez do branco liso */}
      <section className="relative isolate overflow-hidden px-6 pb-24 pt-4 md:pb-32">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-page via-[#e9efff] to-[#dde7ff]" />
        <div aria-hidden className="absolute -left-32 top-10 -z-10 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />
        <div aria-hidden className="absolute -right-32 top-72 -z-10 h-96 w-96 rounded-full bg-accent-light/20 blur-[130px]" />

        <div className="mx-auto max-w-6xl">
          <h2 className="section-title mb-8">Episódios</h2>
          <ListaEpisodios serie={serie} />

          <div className="mt-16 rounded-2xl bg-brand p-8 text-center shadow-2xl shadow-accent/20 sm:p-10">
            <p className="text-2xl font-bold tracking-tight text-white">Seu negócio também vive uma dessas?</p>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Eu desenvolvo sistemas sob medida. Você testa antes de pagar.
            </p>
            <Link href="/#como-contratar" className="btn-primary mt-6">
              Ver como funciona
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
