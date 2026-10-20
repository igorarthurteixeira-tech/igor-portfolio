import type { Metadata } from "next";
import DetalheCarro from "@/components/showroom/DetalheCarro";
import { carrosDemo } from "@/lib/carros";

type Props = { params: Promise<{ id: string }> };

// Os carros de demonstração são gerados na construção; os cadastrados no painel
// (que vivem no navegador) abrem sob demanda, com a página montada no cliente.
export const dynamicParams = true;

export function generateStaticParams() {
  return carrosDemo.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = carrosDemo.find((x) => x.id === id);
  return {
    title: c ? `${c.marca} ${c.modelo} ${c.ano}` : "Veículo",
    description: c ? `${c.marca} ${c.modelo} ${c.versao}, ${c.ano}. Veículo fictício de demonstração.` : undefined,
  };
}

export default async function CarroPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="bg-page px-6 py-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <DetalheCarro id={id} />
      </div>
    </section>
  );
}
