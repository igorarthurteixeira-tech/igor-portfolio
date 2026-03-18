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
    link: "https://marketdrive-analytics.vercel.app/",
    featured: true,
    status: "development",
  },
  {
    id: "moradia",
    title: "Moradia Estudantil",
    description: "Plataforma institucional desenvolvida em Next.js.",
    tech: "Next.js • UI/UX • Deploy Vercel",
    link: "https://moradia-estudantil-delta.vercel.app/",
    featured: true,
    status: "published",
  },
  {
    id: "estoque",
    title: "Sistema de Controle de Estoque (Excel VBA)",
    description: "Sistema automatizado para controle de medicamentos.",
    tech: "Excel • VBA • Automação",
    featured: true,
    status: "published",
  },
  {
    id: "sorveteria",
    title: "Mi Casita",
    description:
      "Aplicação web para gelateria boutique desenvolvida com Next.js 16, focada em experiência refinada e fluxo de reserva com retirada na loja. Implementa carrinho global com Context API, arquitetura híbrida e interface elegante construída com Tailwind CSS.",
    tech:
      "Next.js 16 • React • TypeScript • Tailwind CSS • Context API • Deploy Vercel",
    link: "https://mi-casita.vercel.app/",
    featured: true,
    status: "published",
  },
];
