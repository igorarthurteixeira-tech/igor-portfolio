export type Project = {
  id: string;
  title: string;
  description: string;
  tech: string;
  link?: string;
  featured?: boolean;
  status?: "published" | "development";
};

export const projects: Project[] = [
  {
    id: "marketdrive",
    title: "MarketDrive Analytics",
    description:
      "Plataforma de análise de mercado automotivo com arquitetura modular.",
    tech: "Next.js • TypeScript • Tailwind",
    featured: true,
    status: "development"
  },
  {
    id: "moradia",
    title: "Moradia Estudantil",
    description:
      "Plataforma institucional desenvolvida em Next.js.",
    tech: "Next.js • UI/UX • Deploy Vercel",
    link: "https://moradia-estudantil-delta.vercel.app/",
    featured: true,
    status: "published"
  },
  {
    id: "estoque",
    title: "Sistema de Controle de Estoque (Excel VBA)",
    description:
      "Sistema automatizado para controle de medicamentos.",
    tech: "Excel • VBA • Automação",
    featured: true,
    status: "published"
  }/*,
  
  {
    id: "projeto-extra",
    title: "Projeto Extra",
    description:
      "Projeto adicional que aparece apenas na biblioteca completa.",
    tech: "Node.js • API",
    featured: false,
    status: "published"
  },

  {
    id: "projeto-extra2",
    title: "Projeto Extra",
    description:
      "Projeto adicional que aparece apenas na biblioteca completa.",
    tech: "Node.js • API",
    featured: false,
    status: "development"
  },

  {
    id: "projeto-extra3",
    title: "Projeto Extra",
    description:
      "Projeto adicional que aparece apenas na biblioteca completa.",
    tech: "Node.js • API",
    featured: false,
    status: "published"
  }
  */  
];