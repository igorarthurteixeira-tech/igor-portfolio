import Image from "next/image";
import { projects } from "@/lib/projects";
import AnimatedCard from "@/components/AnimatedCard";

export default function Home() {
  const featuredProjects = projects.filter((project) => project.featured);

  return (
    <>
      <section className="relative min-h-[90vh] w-full overflow-hidden pt-24 md:min-h-screen md:pt-28">
        <Image
          src="/banner.png"
          alt="Background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex h-full items-center justify-center px-6 text-center">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-gray-300">
              Soluções sistêmicas para problemas reais
            </p>

            <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl md:mb-6 md:text-5xl lg:text-6xl">
              Análise, arquitetura e construção de sistemas
            </h1>

            <p className="mb-8 text-base text-gray-300 sm:text-lg md:mb-10 md:text-xl">
              Atuação em consultoria de fluxo, automação, programação full stack
              e desenvolvimento de sistemas sob medida para estruturar e
              destravar operações.
            </p>

            <div className="mb-10 flex flex-wrap justify-center gap-3 text-sm text-gray-200">
              <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2">
                Análise de fluxo
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2">
                Consultoria de sistemas
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2">
                Automação
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2">
                Programação full stack
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2">
                Arquitetura de sistemas
              </span>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#projetos"
                className="rounded-lg bg-white px-8 py-4 text-black transition hover:opacity-80"
              >
                Ver projetos
              </a>

              <a
                href="#contato"
                className="rounded-lg border border-gray-400 px-8 py-4 text-white transition hover:border-white"
              >
                Contato
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="sobre"
        className="border-b border-white/5 bg-[#111111] px-5 pb-20 pt-20 sm:px-6 md:pb-24 md:pt-24"
      >
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[220px_minmax(0,1fr)_340px] lg:items-start">
          <div className="flex justify-center lg:justify-start">
            <div className="h-44 w-44 overflow-hidden rounded-full border border-white/10 bg-[#161616] shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:h-52 sm:w-52">
              <Image
                src="/WhatsApp Image 2026-03-18 at 11.36.19.jpeg"
                alt="Retrato de Igor Arthur"
                width={700}
                height={700}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
              O que eu faço
            </h2>

            <p className="mb-6 leading-relaxed text-gray-400">
              Analiso fluxos, identifico gargalos operacionais e desenho
              soluções técnicas mais claras para processos, sistemas e rotinas.
            </p>

            <p className="leading-relaxed text-gray-400">
              Desenvolvo aplicações full stack, automações e arquiteturas de
              sistema com foco em organização, escalabilidade e aderência ao
              problema real do negócio.
            </p>

            <div className="mt-8 text-sm text-gray-500">
              Next.js • TypeScript • Tailwind • VBA • Automação
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-8">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Áreas de atuação
            </h3>

            <ul className="space-y-4 text-sm text-gray-400">
              <li>• Análise e consultoria de fluxo</li>
              <li>• Consultoria de sistemas</li>
              <li>• Automação de processos</li>
              <li>• Programação full stack</li>
              <li>• Construção e arquitetura de sistemas</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-[#101010] px-6 pb-20 pt-20 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Formação
            </h2>
            <p className="text-gray-400">
              Base acadêmica e estudos aplicados em tecnologia, sistemas e
              desenvolvimento de aplicações.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#181818] p-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
                Graduação
              </p>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Gestão da Tecnologia da Informação - em andamento
              </h3>
              <p className="mb-4 text-sm text-gray-500">Estácio</p>
              <p className="leading-relaxed text-gray-400">
                Ênfase em gestão de sistemas, organização de processos, suporte
                à operação e visão estratégica de tecnologia.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#181818] p-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
                Formação complementar
              </p>
              <h3 className="mb-4 text-xl font-semibold text-white">
                Curso de Programação Full Stack
              </h3>
              <p className="leading-relaxed text-gray-400">
                Estudo de desenvolvimento de aplicações completas, incluindo
                interface, regras de negócio, estrutura de dados e integração
                entre camadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="projetos" className="bg-[#0f0f0f] px-6 pb-24 pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Projetos em Destaque
            </h2>

            <div className="mt-6">
              <a
                href="/projetos"
                className="rounded-md border border-white/20 px-6 py-2 text-sm text-white transition hover:border-white"
              >
                Ver biblioteca completa →
              </a>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {featuredProjects.map((project, index) => (
              <AnimatedCard key={project.id} delay={index * 150}>
                <div className="group flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-white/20">
                  {project.status === "development" && (
                    <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                      Em desenvolvimento
                    </span>
                  )}

                  <h3 className="mb-3 text-xl font-semibold text-white">
                    {project.title}
                  </h3>

                  <p className="mb-6 text-gray-400">{project.description}</p>

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
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
