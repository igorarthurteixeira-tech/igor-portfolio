import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/projects";
import AnimatedCard from "./AnimatedCard";
import { GaleriaBotao, GaleriaCapa, GaleriaProvider } from "./Galeria";

const AVISO_PRIVADO =
  "Projeto privado: o endereço não pode ser publicado. O material mostrado usa nomes e dados fictícios, ou desfocados.";

const selos = {
  development: {
    texto: "Em desenvolvimento",
    cor: "bg-amber-100 text-amber-800",
    ponto: "bg-amber-500",
  },
  internal: {
    texto: "Em uso interno",
    cor: "bg-slate-200 text-slate-700",
    ponto: "bg-slate-500",
  },
  published: {
    texto: "No ar",
    cor: "bg-emerald-100 text-emerald-800",
    ponto: "bg-emerald-600",
  },
} as const;

export default function ProjectCard({
  project,
  delay = 0,
  compact = false,
}: {
  project: Project;
  delay?: number;
  compact?: boolean;
}) {
  const techs = project.tech.split("•").map((t) => t.trim());
  const visiveis = compact && !project.destaque ? techs.slice(0, 4) : techs;
  const resto = techs.length - visiveis.length;
  // Projeto privado: o selo "Projeto privado" substitui "Em uso interno" e "No ar".
  const selo =
    project.status && !(project.privado && project.status !== "development")
      ? selos[project.status]
      : null;
  const galeria = project.galeria?.length ? project.galeria : null;
  const capa = project.image ?? galeria?.[0].src;
  const largo = !!project.destaque;

  const imagem = capa ? (
    galeria ? (
      <GaleriaCapa
        src={capa}
        titulo={project.title}
        className={largo ? "md:mb-0" : "mb-5"}
      />
    ) : (
      <Image
        src={capa}
        alt={`Capa do projeto ${project.title}`}
        width={800}
        height={450}
        className={`aspect-video w-full rounded-xl border border-line object-cover ${
          largo ? "md:mb-0" : "mb-5"
        }`}
      />
    )
  ) : null;

  const conteudo = (
    <article
      className={`card card-hover group relative h-full p-6 ${
        largo
          ? "md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10 md:p-8"
          : "flex flex-col"
      }`}
    >
      {largo && (
        <span className="absolute right-5 top-5 z-10 hidden rounded-full bg-accent-strong px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-lg md:inline-block">
          Em destaque
        </span>
      )}

      {imagem && <div className={largo ? "mb-5 md:mb-0" : ""}>{imagem}</div>}

      <div className={largo ? "flex flex-col" : "flex flex-1 flex-col"}>
        {(project.privado || selo) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {project.privado && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
                Projeto privado
              </span>
            )}
            {selo && (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${selo.cor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${selo.ponto}`} />
                {selo.texto}
              </span>
            )}
          </div>
        )}

        <h3
          className={`mb-3 font-semibold tracking-tight text-fg ${
            largo ? "text-2xl md:text-3xl" : "text-xl"
          }`}
        >
          {project.title}
        </h3>
        <p className="mb-5 leading-relaxed text-muted">{project.description}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {visiveis.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
          {resto > 0 && <span className="chip">+{resto}</span>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2">
          {project.link && !project.privado && (
            project.link.startsWith("/") ? (
              <Link
                href={project.link}
                className="inline-flex w-fit text-sm font-semibold text-fg transition group-hover:text-accent-strong"
              >
                <span className="border-b-2 border-slate-300 pb-0.5 transition group-hover:border-accent-strong">
                  Abrir a demonstração
                </span>
              </Link>
            ) : (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit text-sm font-semibold text-fg transition group-hover:text-accent-strong"
              >
                <span className="border-b-2 border-slate-300 pb-0.5 transition group-hover:border-accent-strong">
                  {project.link.includes("github.com")
                    ? "Ver no GitHub"
                    : "Acessar projeto"}
                </span>
              </a>
            )
          )}
          {galeria && <GaleriaBotao titulo={project.title} />}
          {project.privado && !galeria && (
            <span className="text-sm text-slate-500">
              Sem acesso público
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <AnimatedCard
      id={project.id}
      delay={delay}
      className={`scroll-mt-24 target:[&>article]:ring-2 target:[&>article]:ring-accent-strong ${
        largo ? "sm:col-span-2" : ""
      }`}
    >
      {galeria ? (
        <GaleriaProvider
          titulo={project.title}
          itens={galeria}
          aviso={project.privado ? AVISO_PRIVADO : undefined}
        >
          {conteudo}
        </GaleriaProvider>
      ) : (
        conteudo
      )}
    </AnimatedCard>
  );
}
