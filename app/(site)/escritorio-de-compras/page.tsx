import type { Metadata } from "next";
import Escritorio from "@/components/escritorio/Escritorio";

export const metadata: Metadata = {
  title: "Meu escritório de compras",
  description:
    "Pesquise produtos em lojas reais e acompanhe o preço de cada um ao longo do tempo, com uma equipe de agentes fazendo a pesquisa.",
  alternates: { canonical: "/escritorio-de-compras" },
};

export default function EscritorioDeComprasPage() {
  return (
    <section className="min-h-[70vh] bg-page pb-20 pt-16">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mb-8">
          <p className="eyebrow">Ferramenta</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Meu escritório de compras</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Escolha os produtos que quer acompanhar. Uma equipe de pesquisadores visita lojas reais a cada 3 horas, guarda o
            histórico de preços de cada um e avisa quando o preço sobe ou cai.
          </p>
          <p className="mt-2 max-w-2xl text-xs text-muted">
            Preços lidos das páginas públicas da KaBuM e de lojas da plataforma VTEX (Americanas, Casa&Video, Quero-Quero, Electrolux, Consul, Brastemp, WebContinental, ibyte e outras), sem frete. Confira na loja
            antes de comprar.
          </p>
        </header>
      </div>
      <Escritorio />
    </section>
  );
}
