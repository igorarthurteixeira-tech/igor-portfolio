import EtapasPedido from "./EtapasPedido";

const PONTOS = [
  { titulo: "Peça em minutos", texto: "Descreva o vídeo, envie fotos e materiais e combine o prazo." },
  { titulo: "Acompanhe cada etapa", texto: "Saiba se o pedido está em produção, em avaliação ou pronto." },
  { titulo: "Aprove ou peça ajustes", texto: "Assista à versão no próprio navegador e registre as correções." },
];

/** Lado esquerdo das telas de entrada: explica o serviço e mostra como é um pedido. */
export default function PainelApresentacao() {
  return (
    <div className="text-center lg:text-left">
      <p className="mb-3 inline-block text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">Área da ETM</p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
        Seus vídeos, <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-100 bg-clip-text text-transparent">do pedido à aprovação.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white lg:mx-0">
        Um só lugar para pedir, acompanhar e aprovar cada vídeo, com todo o histórico de versões e correções.
      </p>

      <ul className="mx-auto mt-8 hidden max-w-md space-y-4 text-left sm:block lg:mx-0">
        {PONTOS.map((p) => (
          <li key={p.titulo} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/25 text-cyan-100">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{p.titulo}</p>
              <p className="text-sm text-white/90">{p.texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden className="mx-auto mt-10 hidden max-w-md rounded-2xl border border-white/10 bg-white/95 p-5 text-left shadow-2xl shadow-black/40 lg:mx-0 lg:block">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted">#12 · 14:32</p>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Aguardando sua avaliação</span>
        </div>
        <p className="mt-2 text-base font-bold text-fg">Recap do workshop de compressores</p>
        <p className="mt-1 text-xs text-muted">Versão 1 entregue por Igor · hoje às 14:32</p>
        <div className="mt-4 rounded-xl bg-page px-2 py-4">
          <EtapasPedido status="em_avaliacao" />
        </div>
        <div className="mt-4 flex gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-emerald-600 px-3 py-2 text-white">Aprovar vídeo</span>
          <span className="rounded-lg bg-amber-500 px-3 py-2 text-white">Pedir correção</span>
        </div>
      </div>
    </div>
  );
}
