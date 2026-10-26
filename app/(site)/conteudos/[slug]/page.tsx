import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { conteudoPorSlug, dataCurta, resumoDaLegenda } from "@/lib/conteudos";
import CarrosselImagens from "@/components/conteudos/CarrosselImagens";

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
      <section className="relative isolate overflow-hidden bg-brand px-6 pb-20 pt-20 [clip-path:polygon(0_0,100%_0,100%_calc(100%-3rem),0_100%)]">
        <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-[120px]" />
        <div className="mx-auto max-w-3xl">
          <Link
            href="/conteudos"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <span aria-hidden>←</span> Conteúdos
          </Link>
          <p className="eyebrow-dark">{dataCurta(c.publicadoEm)}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">{c.titulo}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-4">
        <div className="mx-auto max-w-md">
          <CarrosselImagens imagens={c.imagens} titulo={c.titulo} />
        </div>

        {c.legenda && (
          <div className="card mt-10 p-6 sm:p-8">
            <p className="whitespace-pre-line text-base leading-relaxed text-fg">{c.legenda}</p>
          </div>
        )}

        {c.instagram && (
          <div className="mt-8 flex justify-center">
            <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Ver no Instagram
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
