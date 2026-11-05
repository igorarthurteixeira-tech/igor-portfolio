import BrilhosEtm from "@/components/etm/BrilhosEtm";

/** Aparece na hora ao abrir qualquer página da área da ETM, enquanto o servidor busca os dados. */
export default function CarregandoEtm() {
  return (
    <section
      className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden fundo-etm px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <BrilhosEtm leve />
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-cyan-200"
        />
        <p className="text-sm font-semibold text-white">Carregando...</p>
      </div>
    </section>
  );
}
