import type { Metadata } from "next";
import { projects } from "@/lib/projects";
import BibliotecaProjetos from "@/components/BibliotecaProjetos";

export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Biblioteca de sistemas e aplicações desenvolvidas por Igor Arthur: web, automação e sistemas sob medida.",
  alternates: { canonical: "/projetos" },
};

export default function ProjetosPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand px-6 pb-16 pt-20 text-center">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[110px]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="eyebrow-dark">Portfólio</p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Biblioteca de projetos
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Conjunto completo de sistemas e aplicações desenvolvidas.
          </p>
        </div>
      </section>

      <section className="min-h-[50vh] bg-page px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <BibliotecaProjetos projetos={projects} />
        </div>
      </section>
    </>
  );
}
