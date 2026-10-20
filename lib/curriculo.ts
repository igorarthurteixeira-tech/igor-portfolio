import { site } from "./site";
import { projects } from "./projects";

export const curriculo = {
  nome: site.nome,
  titulo: site.titulo,
  contato: {
    email: site.contato.email,
    whatsapp: site.contato.whatsapp,
    linkedin: site.contato.linkedin,
  },
  sobre: site.sobre,
  areasDeAtuacao: site.areasDeAtuacao,
  stack: site.stack,
  formacao: site.formacao,
  projetos: projects
    .filter((p) => p.featured)
    .slice(0, 4) // o PDF tem uma página só
    .map((p) => ({
      titulo: p.title,
      descricao: p.resumo ?? p.description,
      tech: p.tech,
    })),
};
