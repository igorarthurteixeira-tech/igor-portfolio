import { projects } from "@/lib/projects";
import AnimatedCard from "@/components/AnimatedCard";

export default function ProjetosPage() {
  return (
    <section className="min-h-screen bg-[#0f0f0f] px-6 pb-24">
      <div className="mx-auto max-w-6xl pt-20">
        <div className="mb-20 text-center">
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Biblioteca de Projetos
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-gray-400">
            Conjunto completo de sistemas e aplicações desenvolvidas.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => {
            const isDevelopment = project.status === "development";

            return (
              <AnimatedCard key={project.id} delay={index * 150}>
                <div className="group flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-white/20">
                  {isDevelopment && (
                    <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                      Em desenvolvimento
                    </span>
                  )}

                  <h3 className="mb-3 text-xl font-semibold text-white">
                    {project.title}
                  </h3>

                  <p className="mb-6 text-gray-400">{project.description}</p>

                  <div className="mb-6 text-sm text-gray-500">
                    {project.tech}
                  </div>

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative mt-auto inline-block text-sm text-white"
                    >
                      Acessar projeto →
                      <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
