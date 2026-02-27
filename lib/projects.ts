export type Project = {
  id: string;
  title: string;
  description: string;
  tech: string;
  link?: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "marketdrive",
    title: "MarketDrive Analytics",
    description:
      "Plataforma de análise de mercado automotivo com arquitetura modular.",
    tech: "Next.js • TypeScript • Tailwind",
    featured: true
  },
  {
    id: "moradia",
    title: "Moradia Estudantil",
    description:
      "Plataforma institucional desenvolvida em Next.js.",
    tech: "Next.js • UI/UX • Deploy Vercel",
    link: "https://moradia-estudantil-delta.vercel.app/",
    featured: true
  },
  {
    id: "estoque",
    title: "Sistema de Controle de Estoque (Excel VBA)",
    description:
      "Sistema automatizado para controle de medicamentos.",
    tech: "Excel • VBA • Automação",
    featured: true
  },
  {
    id: "projeto-extra",
    title: "Projeto Extra",
    description:
      "Projeto adicional que aparece apenas na biblioteca completa.",
    tech: "Node.js • API",
    featured: false
  }
];