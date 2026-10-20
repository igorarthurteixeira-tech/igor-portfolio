"use client";

import { useState } from "react";
import { categorias, type Categoria, type Project } from "@/lib/projects";
import ProjectCard from "./ProjectCard";

export default function BibliotecaProjetos({
  projetos,
}: {
  projetos: Project[];
}) {
  const [filtro, setFiltro] = useState<Categoria | "todos">("todos");

  const contagem = (id: Categoria) =>
    projetos.filter((p) => p.categoria === id).length;
  const lista =
    filtro === "todos"
      ? projetos
      : projetos.filter((p) => p.categoria === filtro);

  const opcoes: { id: Categoria | "todos"; nome: string; n: number }[] = [
    { id: "todos", nome: "Todos", n: projetos.length },
    ...categorias
      .filter((c) => contagem(c.id) > 0)
      .map((c) => ({ id: c.id, nome: c.nome, n: contagem(c.id) })),
  ];

  return (
    <>
      <div
        role="group"
        aria-label="Filtrar projetos por categoria"
        className="mb-10 flex flex-wrap justify-center gap-2"
      >
        {opcoes.map((o) => (
          <button
            key={o.id}
            onClick={() => setFiltro(o.id)}
            aria-pressed={filtro === o.id}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filtro === o.id
                ? "border-accent-strong bg-accent-strong text-white"
                : "border-line bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {o.nome}
            <span
              className={`ml-2 text-xs ${
                filtro === o.id ? "text-blue-100" : "text-slate-400"
              }`}
            >
              {o.n}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {lista.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            delay={(index % 6) * 80}
          />
        ))}
      </div>
    </>
  );
}
