import BrilhosEtm from "./BrilhosEtm";

/** Cabeçalho escuro da área da ETM, no mesmo estilo do resto do site. */
export default function HeroEtm({
  eyebrow,
  titulo,
  subtitulo,
  acao,
}: {
  eyebrow: string;
  titulo: string;
  subtitulo?: string;
  acao?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden fundo-etm px-6 pb-28 pt-12 [clip-path:polygon(0_0,100%_0,100%_calc(100%-2.5rem),0_100%)]">
      <BrilhosEtm leve />
      <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="mb-3 inline-block text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">{eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_16px_rgba(4,10,50,0.6)] sm:text-4xl">{titulo}</h1>
          {subtitulo && <p className="mt-3 max-w-xl text-base text-white">{subtitulo}</p>}
        </div>
        {acao}
      </div>
    </section>
  );
}
