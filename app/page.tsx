import Image from "next/image";
import { projects } from "@/lib/projects";
import AnimatedCard from "@/components/AnimatedCard";

export default function Home() {
  const featuredProjects = projects.filter((p) => p.featured);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[90vh] md:min-h-screen w-full overflow-hidden pt-24 md:pt-28">
        <Image
          src="/banner.png"
          alt="Background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 flex h-full items-center justify-center text-center px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-white">
              IGOR ARTHUR
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 md:mb-10">
              Programador & Projetista especializado em arquitetura de sistemas,
              desenvolvimento web e estruturação técnica de projetos.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="#projetos"
                className="px-8 py-4 bg-white text-black rounded-lg hover:opacity-80 transition"
              >
                Ver Projetos
              </a>

              <a
                href="#contato"
                className="px-8 py-4 border border-gray-400 text-white rounded-lg hover:border-white transition"
              >
                Contato
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section
        id="sobre"
        className="bg-[#111111] pt-20 md:pt-24 pb-20 md:pb-24 px-5 sm:px-6 border-b border-white/5"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Sobre
            </h2>

            <p className="text-gray-400 mb-6 leading-relaxed">
              Desenvolvedor focado em arquitetura de sistemas,
              organização estrutural de aplicações e automação de processos.
            </p>

            <p className="text-gray-400 leading-relaxed">
              Experiência com Next.js, TypeScript e desenvolvimento de sistemas
              institucionais, incluindo automações em Excel VBA.
            </p>

            <div className="mt-8 text-sm text-gray-500">
              Next.js • TypeScript • Tailwind • VBA • Automação
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-10">
            <h3 className="text-xl font-semibold text-white mb-4">
              Foco Profissional
            </h3>

            <ul className="space-y-4 text-gray-400 text-sm">
              <li>• Estruturação técnica de projetos</li>
              <li>• Arquitetura escalável</li>
              <li>• Organização de dados</li>
              <li>• Performance e clareza estrutural</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PROJETOS EM DESTAQUE */}
      <section
        id="projetos"
        className="bg-[#0f0f0f] pt-20 pb-24 px-6"
      >
        <div className="max-w-6xl mx-auto">

          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Projetos em Destaque
            </h2>

            <div className="mt-6">
              <a
                href="/projetos"
                className="text-sm text-white border border-white/20 px-6 py-2 rounded-md hover:border-white transition"
              >
                Ver biblioteca completa →
              </a>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featuredProjects.map((project, index) => (
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
    </>
  );
}