import Image from "next/image";
import Link from "next/link";
import { conteudos, dataCurta } from "@/lib/conteudos";

/** Últimos carrosséis do Instagram. Sem nenhum publicado, a seção nem aparece. */
export default async function SecaoConteudos() {
  const itens = (await conteudos()).slice(0, 3);
  if (itens.length === 0) return null;

  return (
    <section id="conteudos" className="bg-page px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Instagram</p>
            <h2 className="section-title">Conteúdos</h2>
          </div>
          <Link href="/conteudos" className="btn-outline">
            Ver todos
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((c) => (
            <li key={c.slug}>
              <Link href={`/conteudos/${c.slug}`} className="card card-hover group block overflow-hidden">
                <div className="relative aspect-4/5 w-full bg-brand">
                  <Image
                    src={c.imagens[0]}
                    alt={`Capa de ${c.titulo}`}
                    fill
                    sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                    {c.imagens.length} slides
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">{dataCurta(c.publicadoEm)}</p>
                  <h3 className="mt-1 text-lg font-bold leading-snug text-fg">{c.titulo}</h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
