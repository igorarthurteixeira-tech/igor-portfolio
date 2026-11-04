import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { conteudoPorSlug, dataCurta, resumoDaLegenda } from "@/lib/conteudos";
import CarrosselImagens from "@/components/conteudos/CarrosselImagens";
import LegendaFormatada from "@/components/conteudos/LegendaFormatada";

// Os carrosséis vêm do painel de Publicações: a página se atualiza sozinha a cada 5 minutos.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await conteudoPorSlug(slug);
  if (!c) return {};
  const descricao = resumoDaLegenda(c.legenda);
  return {
    title: c.titulo,
    description: descricao || undefined,
    alternates: { canonical: `/conteudos/${c.slug}` },
    openGraph: { title: c.titulo, description: descricao || undefined, images: [{ url: c.imagens[0] }] },
  };
}

export default async function ConteudoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await conteudoPorSlug(slug);
  if (!c) notFound();

  return (
    <div className="bg-page">
      <section className="relative isolate overflow-hidden bg-brand px-6 pb-24 pt-16 [clip-path:polygon(0_0,100%_0,100%_calc(100%-3rem),0_100%)]">
        <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-[120px]" />
        <div className="mx-auto max-w-5xl">
          <Link
            href="/conteudos"
            className="mb-8 flex w-fit items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <span aria-hidden>←</span> Conteúdos
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-light">{dataCurta(c.publicadoEm)}</p>
            <span className="chip-dark">{c.imagens.length} slides</span>
          </div>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">{c.titulo}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-2">
        <div className="grid gap-10 lg:grid-cols-[25rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="mx-auto w-full max-w-md lg:sticky lg:top-24">
            <CarrosselImagens imagens={c.imagens} titulo={c.titulo} />
          </div>

          <div className="space-y-6">
            {c.legenda && <LegendaFormatada legenda={c.legenda} />}

            <div className="flex flex-wrap gap-3">
              {c.instagram && (
                <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="btn-dark">
                  Ver no Instagram
                </a>
              )}
              <Link href="/conteudos" className="btn-outline">
                Outros conteúdos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
