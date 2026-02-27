import { projects } from "@/lib/projects";
import AnimatedCard from "@/components/AnimatedCard";

export default function ProjetosPage() {
  return (
    <section className="min-h-screen bg-[#0f0f0f] pb-24 px-6">
      <div className="max-w-6xl mx-auto pt-20">

        <div className="mb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Biblioteca de Projetos
          </h1>

          <p className="text-gray-400 mt-6 max-w-2xl mx-auto">
            Conjunto completo de sistemas e aplicações desenvolvidas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <AnimatedCard key={project.id} delay={index * 150}>
              <div className="group h-full flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 hover:border-white/20">

                {!project.link && (
                  <span className="inline-block text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full mb-4">
                    Em desenvolvimento
                  </span>
                )}

                <h3 className="text-xl font-semibold text-white mb-3">
                  {project.title}
                </h3>

                <p className="text-gray-400 mb-6">
                  {project.description}
                </p>

                <div className="text-sm text-gray-500 mb-6">
                  {project.tech}
                </div>

                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-sm mt-auto relative inline-block"
                  >
                    Acessar projeto →
                    <span className="absolute left-0 -bottom-1 h-px w-0 bg-white transition-all duration-300 group-hover:w-full"></span>
                  </a>
                )}

              </div>
            </AnimatedCard>
          ))}
        </div>

      </div>
    </section>
  );
}