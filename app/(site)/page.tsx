import Image from "next/image";
import Link from "next/link";
import { projects } from "@/lib/projects";
import { site } from "@/lib/site";
import ProjectCard from "@/components/ProjectCard";
import AnimatedCard from "@/components/AnimatedCard";
import HeroStage from "@/components/hero/HeroStage";
import HeroBackground from "@/components/hero/HeroBackground";
import HeroVitrine from "@/components/hero/HeroVitrine";
import HeroFases from "@/components/hero/HeroFases";
import PalavraGiratoria from "@/components/hero/PalavraGiratoria";
import Contador from "@/components/hero/Contador";
import TeclasSecoes from "@/components/TeclasSecoes";
import IconeEtapa from "@/components/IconeEtapa";
import BotaoChat from "@/components/BotaoChat";
import SecaoSeries from "@/components/series/SecaoSeries";

export default function Home() {
  const featuredProjects = projects.filter((project) => project.featured);
  const tecnologias = new Set(
    projects.flatMap((p) => p.tech.split("•").map((t) => t.trim())),
  );
  tecnologias.delete("UI/UX"); // não é uma tecnologia
  const stats = [
    { valor: projects.length, rotulo: "projetos no portfólio" },
    {
      valor: projects.filter((p) => p.status === "published").length,
      rotulo: "sites e apps no ar",
    },
    { valor: tecnologias.size, rotulo: "tecnologias usadas" },
  ];
  const vitrine = [
    { id: "retro-games", src: "/projetos/retro-games-2.jpg", nome: "Retro Games", selo: "No ar" },
    { id: "pdv", src: "/projetos/pdv-venda-2.jpg", nome: "PDV com caixa e estoque", selo: "Projeto privado", privado: true },
    { id: "sistema-interno", src: "/projetos/interno-home.jpg", nome: "Sistema interno", selo: "Projeto privado", privado: true },
  ];

  return (
    <>
      <TeclasSecoes />
      {/* HERO: faixa escura, dinâmica */}
      <HeroStage className="relative flex min-h-[78vh] w-full items-center overflow-hidden bg-brand px-6 pb-16 pt-16 lg:min-h-[calc(100vh-4rem)] lg:pb-24 lg:pt-20">
        <Image
          src="/banner.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand/60 via-[#0a1a6b]/25 to-brand/85" />
        <div className="bg-grid absolute inset-0" />
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <HeroBackground />

        <HeroFases
          topo={
            <>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-brand/60 px-4 py-2 text-sm font-medium text-white backdrop-blur max-lg:transition-all max-lg:duration-700 max-lg:group-data-[compacto=true]/hero:mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Disponível para novos projetos
              </div>

              <h1 className="mb-6 text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl max-lg:transition-all max-lg:duration-700 max-lg:group-data-[compacto=true]/hero:mb-0 max-lg:group-data-[compacto=true]/hero:text-2xl">
                {site.heroTitulo.antes}
                <span className="text-gradient">{site.heroTitulo.destaque}</span>
                {site.heroTitulo.meio}
                <PalavraGiratoria variacoes={site.heroTitulo.variacoes} />
              </h1>
            </>
          }
          apresentacao={
            <>
              <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-100 sm:text-lg lg:mx-0 lg:text-xl">
                {site.subtitulo}
              </p>

              <div className="mb-12 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href={site.contato.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Chamar no WhatsApp
                </a>
                <a href="#projetos" className="btn-ghost">
                  Ver projetos
                </a>
              </div>

              <dl className="mx-auto grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6 lg:mx-0">
                {stats.map((s) => (
                  <div key={s.rotulo} className="flex flex-col-reverse justify-end">
                    <dt className="mt-1 text-xs leading-snug text-slate-300">
                      {s.rotulo}
                    </dt>
                    <dd className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      <Contador valor={s.valor} />
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          }
          vitrine={<HeroVitrine itens={vitrine} />}
        />
      </HeroStage>

      {/* VIDA DE DONO: séries de ficção */}
      <SecaoSeries />

      {/* SOBRE: claro */}
      <section id="sobre" className="bg-page px-5 py-20 sm:px-6 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[260px_minmax(0,1fr)_340px] lg:items-start">
          <AnimatedCard>
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-accent to-accent-light opacity-40 blur-xl" />
                <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-white shadow-xl sm:h-60 sm:w-60">
                  <Image
                    src="/perfil.jpg"
                    alt="Retrato de Igor Arthur"
                    width={700}
                    height={700}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={100}>
            <div className="text-center lg:text-left">
              <p className="eyebrow">Sobre</p>
              <h2 className="section-title mb-6">Como eu trabalho</h2>

              {site.sobre.map((texto, i) => (
                <p
                  key={texto}
                  className={`mb-5 leading-relaxed ${
                    i === site.sobre.length - 1
                      ? "font-medium text-fg"
                      : "text-muted"
                  }`}
                >
                  {texto}
                </p>
              ))}

              <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                {site.stack.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>

              <a href="/api/curriculo" className="btn-dark mt-8">
                Baixar currículo (PDF)
              </a>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={200}>
            <div className="card p-8">
              <h3 className="mb-5 text-lg font-semibold text-fg">
                Áreas de atuação
              </h3>
              <ul className="space-y-4 text-sm text-muted">
                {site.areasDeAtuacao.map((area) => (
                  <li key={area} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-strong" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedCard>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-contratar" className="relative overflow-hidden border-y border-line bg-page-2 px-6 py-20 md:py-28">
        <div aria-hidden className="bg-pontos pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-16 h-96 w-96 rounded-full bg-accent/25 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-10 h-[28rem] w-[28rem] rounded-full bg-sky-300/40 blur-[120px]"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 max-w-3xl">
            <p className="eyebrow">Processo</p>
            <h2 className="section-title mb-4">Como funciona</h2>
            <p className="text-lg text-muted">{site.comoIntro}</p>
          </div>

          {site.comoFases.map((fase, f) => {
            const etapas = site.como
              .map((e, i) => ({ ...e, n: i + 1 }))
              .filter((e) => e.fase === f + 1);
            return (
              <div
                key={fase.titulo}
                data-parada={f === 1 ? "pagamento" : undefined}
                className={f === 0 ? "" : "mt-14"}
              >
                <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span
                    className={`rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                      f === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-brand text-white"
                    }`}
                  >
                    {fase.selo}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-fg">
                    {fase.titulo}
                  </h3>
                  <p className="basis-full text-muted sm:basis-auto">
                    {fase.texto}
                  </p>
                </div>

                <ol
                  className={`grid gap-5 sm:grid-cols-2 ${
                    f === 0 ? "lg:grid-cols-5" : "lg:grid-cols-3"
                  }`}
                >
                  {etapas.map((etapa, i) => (
                    <AnimatedCard
                      key={etapa.titulo}
                      delay={i * 90}
                      rootMargin={f === 1 ? "0px 0px -20% 0px" : undefined}
                      fantasma={f === 1}
                    >
                      <li
                        className={`card card-hover relative flex h-full flex-col p-6 ${
                          etapa.destaque
                            ? "border-accent-strong bg-accent-strong/[0.06] ring-1 ring-accent-strong/40"
                            : etapa.vantagem
                              ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/40"
                              : ""
                        }`}
                      >
                        <span className="absolute right-5 top-5 text-sm font-bold tabular-nums text-slate-300">
                          {String(etapa.n).padStart(2, "0")}
                        </span>
                        <span
                          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
                            etapa.destaque
                              ? "bg-accent-strong text-white"
                              : "bg-accent-strong/10 text-accent-strong"
                          }`}
                        >
                          <IconeEtapa nome={etapa.icone} />
                        </span>
                        {etapa.vantagem && (
                          <span className="mb-2 w-fit whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                            Sua vantagem
                          </span>
                        )}
                        <h4 className="mb-2 text-lg font-semibold tracking-tight text-fg">
                          {etapa.titulo}
                        </h4>
                        <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">
                          {etapa.texto}
                        </p>
                        <span className="chip w-fit">{etapa.quem}</span>
                      </li>
                    </AnimatedCard>
                  ))}
                  {f === 1 && (
                    <AnimatedCard delay={200} rootMargin="0px 0px -20% 0px" fantasma>
                      <li className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-xl shadow-slate-900/20 sm:col-span-2 lg:col-span-1">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent/40 blur-[60px]"
                        />
                        <h4 className="relative mb-1 text-lg font-semibold tracking-tight">
                          Você fica protegido
                        </h4>
                        <p className="relative mb-5 text-sm text-slate-300">
                          O processo foi pensado para você decidir com segurança.
                        </p>
                        <ul className="relative flex flex-col gap-3">
                          {site.comoGarantias.map((g) => (
                            <li key={g} className="flex items-start gap-3 text-sm leading-relaxed">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                                <IconeEtapa nome="check" className="h-3 w-3" />
                              </span>
                              {g}
                            </li>
                          ))}
                        </ul>
                      </li>
                    </AnimatedCard>
                  )}
                </ol>
                {f === 0 && (
                  <AnimatedCard delay={150}>
                    <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-500 bg-emerald-50/80 p-6 ring-1 ring-emerald-500/30 sm:flex-row sm:items-center">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                        <IconeEtapa nome="teste" />
                      </span>
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          Sua grande vantagem
                        </p>
                        <p className="leading-relaxed text-fg">{site.comoVantagem}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                )}
              </div>
            );
          })}

          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <BotaoChat>Começar pela conversa</BotaoChat>
            <a
              href={site.contato.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* PROJETOS: claro */}
      <section id="projetos" className="bg-page px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Portfólio</p>
              <h2 className="section-title">Projetos em destaque</h2>
            </div>
            <Link href="/projetos" className="btn-outline">
              Ver biblioteca completa
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {featuredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                delay={index * 120}
                compact
              />
            ))}
          </div>
        </div>
      </section>

      {/* FORMAÇÃO: tom mais escuro de claro, com bordas */}
      <section
        id="formacao"
        className="border-y border-line bg-page-2 px-6 py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="eyebrow">Trajetória</p>
            <h2 className="section-title mb-4">Formação</h2>
            <p className="text-muted">
              Engenharia de Software na graduação e programação full stack na prática.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {site.formacao.map((item, i) => (
              <AnimatedCard key={item.curso} delay={i * 120}>
                <div className="card card-hover h-full p-8">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
                    {item.periodo}
                  </p>
                  <h3 className="mb-2 text-xl font-semibold tracking-tight text-fg">
                    {item.curso}
                  </h3>
                  <p className="mb-4 text-sm font-semibold text-slate-700">
                    {item.instituicao}
                  </p>
                  <p className="leading-relaxed text-muted">
                    {item.descricao}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
