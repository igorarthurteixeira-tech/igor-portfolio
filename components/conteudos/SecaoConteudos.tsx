import Image from "next/image";
import Link from "next/link";
import { conteudos, dataCurta, resumoDaLegenda, type Conteudo } from "@/lib/conteudos";

/** Um carrossel só: vira um destaque em duas colunas, em vez de um cartão perdido numa grade vazia. */
function Destaque({ c }: { c: Conteudo }) {
  const proximos = c.imagens.slice(1, 4);
  const resto = c.imagens.length - 1 - proximos.length;

  return (
    <article className="card overflow-hidden md:grid md:grid-cols-[22rem_1fr]">
      <Link
        href={`/conteudos/${c.slug}`}
        aria-label={`Abrir ${c.titulo}`}
        className="group relative block aspect-4/5 bg-brand md:aspect-auto md:min-h-[27.5rem]"
      >
        <Image
          src={c.imagens[0]}
          alt={`Capa de ${c.titulo}`}
          fill
          sizes="(min-width:768px) 352px, 92vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
          {c.imagens.length} slides
        </span>
      </Link>

      <div className="flex flex-col justify-center p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">{dataCurta(c.publicadoEm)}</p>
        <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-fg sm:text-3xl">
          <Link href={`/conteudos/${c.slug}`} className="transition hover:text-accent-strong">
            {c.titulo}
          </Link>
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted">{resumoDaLegenda(c.legenda, 280)}</p>

        {proximos.length > 0 && (
          <ul className="mt-6 flex items-center gap-3" aria-label="Próximos slides">
            {proximos.map((src, i) => (
              <li key={src} className="relative aspect-4/5 w-16 overflow-hidden rounded-lg border border-line bg-brand">
                <Image src={src} alt={`Slide ${i + 2} de ${c.titulo}`} fill sizes="64px" className="object-cover" />
              </li>
            ))}
            {resto > 0 && <li className="text-sm font-semibold text-muted">+{resto}</li>}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/conteudos/${c.slug}`} className="btn-dark">
            Ler o carrossel
          </Link>
          {c.instagram && (
            <a href={c.instagram} target="_blank" rel="noreferrer" className="btn-outline">
              Ver no Instagram
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** Últimos carrosséis do Instagram. Sem nenhum publicado, a seção nem aparece. */
export default async function SecaoConteudos() {
  const todos = await conteudos();
  if (todos.length === 0) return null;
  const itens = todos.slice(0, 3);

  return (
    <section id="conteudos" className="border-y border-line bg-page-2 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Instagram</p>
            <h2 className="section-title">Conteúdos</h2>
            <p className="mt-3 max-w-xl text-base text-muted">
              Análises e explicações em formato de carrossel, para ler com calma e salvar.
            </p>
          </div>
          {todos.length > 1 && (
            <Link href="/conteudos" className="btn-outline">
              Ver todos ({todos.length})
            </Link>
          )}
        </div>

        {itens.length === 1 ? (
          <Destaque c={itens[0]} />
        ) : (
          <ul className={`grid gap-6 sm:grid-cols-2 ${itens.length > 2 ? "lg:grid-cols-3" : ""}`}>
            {itens.map((c) => (
              <li key={c.slug}>
                <Link href={`/conteudos/${c.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
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
                  <div className="flex grow flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">{dataCurta(c.publicadoEm)}</p>
                    <h3 className="mt-1 text-lg font-bold leading-snug text-fg">{c.titulo}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{resumoDaLegenda(c.legenda, 140)}</p>
                    <span className="mt-4 text-sm font-semibold text-accent-strong">Ler o carrossel →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
