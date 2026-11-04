/**
 * Fundo vivo da área da ETM: degradê que desliza, faixas de luz que atravessam a tela e brilhos que
 * flutuam. Tudo animado só com transform e sem desfoque, para não pesar. Vai dentro de uma seção
 * `relative isolate overflow-hidden fundo-etm`. `leve` usa menos camadas (cabeçalhos das páginas internas).
 */
export default function BrilhosEtm({ leve = false }: { leve?: boolean }) {
  return (
    <>
      <div aria-hidden className="etm-degrade pointer-events-none absolute inset-y-0 left-0 -z-10 w-[200%]" />
      {!leve && (
        <>
          <div
            aria-hidden
            className="etm-brilho-a pointer-events-none absolute -left-32 -top-24 -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_65%)]"
          />
          <div
            aria-hidden
            className="etm-brilho-b pointer-events-none absolute -right-32 top-1/4 -z-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.22),transparent_65%)]"
          />
          <div aria-hidden className="etm-faixa-2 pointer-events-none absolute inset-0 -z-10" />
        </>
      )}
      <div aria-hidden className="etm-faixa-1 pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#050f3d]/55 via-[#050f3d]/15 to-transparent" />
    </>
  );
}
