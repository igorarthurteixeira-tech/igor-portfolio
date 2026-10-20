export type Categoria = "web" | "app" | "jogo" | "ferramenta";

export const categorias: { id: Categoria; nome: string }[] = [
  { id: "web", nome: "Sistemas web" },
  { id: "app", nome: "Aplicativos" },
  { id: "jogo", nome: "Jogos" },
  { id: "ferramenta", nome: "Ferramentas" },
];

/** Uma imagem ou um clipe curto de navegação (mp4 sem áudio, com poster). */
export type ItemGaleria = {
  src: string;
  legenda: string;
  width?: number;
  height?: number;
  video?: boolean;
  /** Imagem mostrada antes de o vídeo tocar e na miniatura. */
  poster?: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  categoria: Categoria;
  /** Versão curta para o currículo; se ausente, usa description. */
  resumo?: string;
  /** Capa em /public (ex.: "/projetos/exemplo.jpg"). */
  image?: string;
  /**
   * Capturas e clipes para projetos que não podem ser abertos publicamente.
   * O card abre uma galeria em tela cheia. Use só material sem dados reais
   * (ou com os dados desfocados).
   */
  galeria?: ItemGaleria[];
  tech: string;
  /** Link público. Projetos privados não têm link. */
  link?: string;
  /** Mostra o selo "Projeto privado": o endereço não pode ser publicado. */
  privado?: boolean;
  /** Aparece na home e no currículo. */
  featured?: boolean;
  /** Card largo, no topo da lista. */
  destaque?: boolean;
  /** Sem status, o card não mostra selo. */
  status?: "published" | "development" | "internal";
};

const todosOsProjetos: Project[] = [
  // ----- Destaques (home e currículo) -----
  {
    id: "pdv",
    title: "PDV com controle de estoque e caixa",
    description:
      "Ponto de venda para loja, com abertura e fechamento de caixa, entradas e retiradas, controle de estoque com conferência por inventário, etiquetas com QR code, leitor de código de barras no celular e visor para o cliente acompanhar a compra. Inclui relatórios por fornecedor e painel com acesso por perfil.",
    resumo:
      "PDV com caixa, estoque, etiquetas, leitor de código de barras no celular e relatórios.",
    categoria: "web",
    image: "/projetos/pdv-venda-2.jpg",
    galeria: [
      {
        src: "/projetos/pdv-clipe-venda.mp4",
        poster: "/projetos/pdv-venda-2.jpg",
        video: true,
        legenda:
          "Clipe: abertura do caixa, busca de produtos, carrinho e recebimento em Pix",
      },
      {
        src: "/projetos/pdv-visor-clipe.mp4",
        poster: "/projetos/pdv-visor-venda-2.jpg",
        video: true,
        legenda:
          "Clipe: o Visor, a tela que o cliente vê, acompanhando a venda em tempo real",
      },
      {
        src: "/projetos/pdv-venda-2.jpg",
        legenda: "Tela de venda, com busca, categorias e carrinho",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/pdv-visor-venda-2.jpg",
        legenda: "Visor do cliente, com os itens e o total da compra",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/pdv-pagamento-2.jpg",
        legenda: "Finalização da venda, com escolha do método de pagamento",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/pdv-clipe-gestao.mp4",
        poster: "/projetos/pdv-dashboard-2.jpg",
        video: true,
        legenda:
          "Clipe: estoque, painel de vendas e relatório por fornecedor",
      },
      {
        src: "/projetos/pdv-dashboard-2.jpg",
        legenda: "Painel com vendas do dia, do mês e estoque crítico",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/pdv-estoque-2.jpg",
        legenda: "Lista de estoque, com alerta de produtos abaixo do mínimo",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/pdv-relatorios-2.jpg",
        legenda: "Relatório de fechamento por fornecedor",
        width: 1366,
        height: 768,
      },
    ],
    tech: "Python • SQLite • WebSocket • JavaScript",
    privado: true,
    featured: true,
    destaque: true,
  },
  {
    id: "sistema-interno",
    title: "Sistema interno para operação de saúde",
    description:
      "Agenda médica, monitoramento de câmeras, envio de mensagens e painéis de dados por setor, com acesso liberado conforme o perfil de cada usuário.",
    resumo:
      "Agenda médica, câmeras, mensagens e painéis de dados por setor, com acesso por perfil.",
    categoria: "web",
    image: "/projetos/interno-home.jpg",
    galeria: [
      {
        src: "/projetos/interno-clipe-ambulatorio.mp4",
        poster: "/projetos/interno-agenda.jpg",
        video: true,
        legenda:
          "Clipe: secretaria ambulatorial, com agenda médica, busca de pacientes e confirmações por WhatsApp",
      },
      {
        src: "/projetos/interno-clipe-farmacia.mp4",
        poster: "/projetos/interno-farmacia-graficos.jpg",
        video: true,
        legenda:
          "Clipe: farmácia, com consulta de medicamentos, histórico de movimentações e gráficos",
      },
      {
        src: "/projetos/interno-home.jpg",
        legenda: "Tela inicial por setores, com acesso conforme o perfil do usuário",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/interno-agenda.jpg",
        legenda: "Agenda médica, com as consultas de cada dia",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/interno-pacientes.jpg",
        legenda: "Busca de pacientes por nome, matrícula, CPF ou telefone",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/interno-whatsapp.jpg",
        legenda: "Confirmação de consultas por WhatsApp, por médico",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/interno-farmacia-medicamentos.jpg",
        legenda: "Medicamentos, com estoque, validade e alerta de estoque baixo",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/interno-farmacia-graficos.jpg",
        legenda: "Gráficos de saídas e entradas de medicamentos",
        width: 1366,
        height: 768,
      },
      {
        src: "/projetos/sistema-interno-login-2.jpg",
        legenda: "Tela de acesso, com login por usuário e senha (nome e emblema de exemplo)",
        width: 1440,
        height: 900,
      },
    ],
    tech: "Python • SQLite • JavaScript",
    privado: true,
    featured: true,
  },
  {
    id: "retro-games",
    title: "Retro Games",
    description:
      "Site com 11 jogos retrô, conta de usuário e assinatura mensal com cobrança recorrente pelo Stripe.",
    resumo:
      "Site de jogos retrô com conta de usuário e assinatura mensal via Stripe.",
    categoria: "jogo",
    image: "/projetos/retro-games-2.jpg",
    tech: "JavaScript • Supabase • Stripe • Vercel",
    link: "https://retrogames.app.br",
    featured: true,
    status: "published",
  },
  {
    id: "controle-financeiro",
    title: "Controle financeiro pessoal e empresarial",
    description:
      "Várias contas por usuário, cartões de crédito, investimentos e objetivos, para uso pessoal ou empresarial.",
    resumo:
      "Controle financeiro com várias contas, cartões, investimentos e objetivos.",
    categoria: "web",
    image: "/projetos/controle-financeiro-2.jpg",
    tech: "NestJS • Prisma • React • PostgreSQL • Vercel",
    privado: true,
    featured: true,
    status: "development",
  },
  {
    id: "redencao",
    title: "Redenção",
    description:
      "Aplicativo católico com orações guiadas, grupos de oração, quiz e notícias da Igreja atualizadas automaticamente.",
    resumo: "App católico com orações guiadas, grupos de oração, quiz e notícias.",
    categoria: "app",
    image: "/projetos/redencao-2.jpg",
    tech: "Expo • React Native • Supabase",
    featured: true,
    status: "development",
  },

  // ----- Biblioteca -----
  {
    id: "showroom",
    title: "Showroom de veículos",
    description:
      "Vitrine de carros com filtros e ordenação, página de cada veículo com galeria, simulador de financiamento, formulário de interesse e painel de cadastro. Loja de demonstração, com marcas fictícias e fotos geradas por inteligência artificial.",
    categoria: "web",
    image: "/projetos/showroom-4.jpg",
    tech: "Next.js • React • TypeScript • Tailwind",
    link: "/showroom",
    status: "published",
  },
  {
    id: "pedidos-restaurantes",
    title: "Plataforma de pedidos para restaurantes",
    description:
      "Pedidos para vários restaurantes, com cálculo de preço e taxa de entrega e roteirização das entregas.",
    categoria: "web",
    image: "/projetos/pedidos-restaurantes-2.jpg",
    galeria: [
      {
        src: "/projetos/pedidos-restaurantes-2.jpg",
        legenda: "Lista de restaurantes",
        width: 1440,
        height: 810,
      },
    ],
    tech: "Next.js • Supabase • Google Maps",
    privado: true,
    status: "development",
  },
  {
    id: "autoconhecimento-ia",
    title: "App de autoconhecimento com IA",
    description:
      "Aplicação web de conversas com inteligência artificial voltadas ao autoconhecimento, com contas de usuário e assinatura via Stripe (em modo de teste).",
    categoria: "web",
    image: "/projetos/autoconhecimento-ia-2.jpg",
    galeria: [
      {
        src: "/projetos/autoconhecimento-ia-2.jpg",
        legenda: "Tela de entrada",
        width: 1440,
        height: 810,
      },
    ],
    tech: "Next.js • Firebase • Stripe • IA",
    privado: true,
    status: "development",
  },
  {
    id: "portal-de-curso",
    title: "Portal de curso",
    description:
      "Portal para gerenciar um curso paroquial com cerca de 160 participantes: cadastro em etapas, sala de aula, notas, frequência e controle de inscrições.",
    categoria: "web",
    image: "/projetos/portal-de-curso-2.jpg",
    galeria: [
      {
        src: "/projetos/portal-de-curso-2.jpg",
        legenda: "Página inicial (logo e nome de exemplo)",
        width: 1440,
        height: 810,
      },
    ],
    tech: "Next.js • Prisma • NextAuth • Neon",
    privado: true,
  },
  {
    id: "pedido-musicas",
    title: "Músicas da Missa",
    description:
      "App para os músicos escolherem, de casa, as músicas de cada momento da missa. O sistema da paróquia busca as escolhas pela internet ao montar a celebração.",
    categoria: "web",
    image: "/projetos/pedido-musicas-2.jpg",
    galeria: [
      {
        src: "/projetos/pedido-musicas-2.jpg",
        legenda: "Tela de acesso (logo e nome de exemplo)",
        width: 1440,
        height: 810,
      },
    ],
    tech: "Next.js • TypeScript • PostgreSQL • Vercel",
    privado: true,
  },
  {
    id: "site-paroquial",
    title: "Site paroquial",
    description:
      "Reconstrução do site institucional de uma paróquia, com painel de administração para editar o conteúdo.",
    categoria: "web",
    image: "/projetos/site-paroquial-3.jpg",
    galeria: [
      {
        src: "/projetos/site-paroquial-clipe-3.mp4",
        poster: "/projetos/site-paroquial-3.jpg",
        video: true,
        legenda:
          "Clipe: navegação pelo site, com menu, páginas e rolagem (nomes, logo e contatos fictícios)",
      },
      {
        src: "/projetos/site-paroquial-3.jpg",
        legenda: "Página inicial",
        width: 1440,
        height: 810,
      },
      {
        src: "/projetos/site-paroquial-missas-3.jpg",
        legenda: "Horários de missa da semana",
        width: 1440,
        height: 810,
      },
      {
        src: "/projetos/site-paroquial-contato-3.jpg",
        legenda: "Contato, endereço e mapa",
        width: 1440,
        height: 810,
      },
    ],
    tech: "Next.js • TypeScript • Vercel",
    privado: true,
    status: "development",
  },
  {
    id: "agenda-compartilhada",
    title: "Agenda compartilhada",
    description:
      "Várias agendas por pessoa (casa, família, trabalho), cada uma com cor e membros próprios, compartilhamento por e-mail com três níveis de permissão e visões de mês, semana e lista.",
    categoria: "web",
    image: "/projetos/agenda-compartilhada-2.jpg",
    tech: "Next.js • PostgreSQL • Tailwind",
    status: "development",
  },
  {
    id: "confirmacao-qr",
    title: "Confirmação de presença por QR",
    description:
      "Página em que o paciente confirma a chegada lendo um QR code, integrada ao sistema interno da secretaria.",
    categoria: "web",
    image: "/projetos/confirmacao-qr-2.jpg",
    tech: "JavaScript • Vercel • Neon",
    status: "internal",
  },
  {
    id: "sorveteria",
    title: "Sistema para gelateria boutique",
    description:
      "Loja online com carrinho global e fluxo de reserva com retirada na loja, em interface pensada para uma marca premium.",
    categoria: "web",
    image: "/projetos/sorveteria-2.jpg",
    tech: "Next.js • React • TypeScript • Tailwind CSS • Context API",
    link: "https://sistema-para-gelateria-boutique.vercel.app/",
    status: "published",
  },
  {
    id: "moradia",
    title: "Moradia Estudantil",
    description:
      "Plataforma institucional da Moradia Estudantil, desenvolvida em Next.js e publicada na Vercel.",
    categoria: "web",
    image: "/projetos/moradia-2.jpg",
    tech: "Next.js • UI/UX • Vercel",
    link: "https://moradia-estudantil-delta.vercel.app/",
    status: "published",
  },
  {
    id: "marketdrive",
    title: "MarketDrive Analytics",
    description:
      "Plataforma de análise do mercado automotivo, organizada em módulos para evoluir por etapas.",
    categoria: "web",
    image: "/projetos/marketdrive-2.jpg",
    tech: "Next.js • TypeScript • Tailwind",
    link: "https://marketdrive-analytics.vercel.app/",
    status: "development",
  },
  {
    id: "assistente-compras",
    title: "Assistente de Compras",
    description:
      "Aplicativo de celular com contas na nuvem, notificações e assinatura paga via Stripe.",
    categoria: "app",
    image: "/projetos/assistente-compras-2.jpg",
    tech: "Expo • React Native • Supabase • Stripe",
    status: "development",
  },
  {
    id: "ghostcall",
    title: "GhostCall",
    description:
      "App Android que filtra ligações recebidas para conter as chamadas fantasma: toca normal para contatos e números conhecidos, e rejeita ou silencia os demais conforme a regra escolhida.",
    categoria: "app",
    image: "/projetos/ghostcall-2.jpg",
    tech: "Kotlin • Android",
    status: "development",
  },
  {
    id: "carrinho-ctf",
    title: "Steel Flag",
    description:
      "Jogo 2D de guerra de carrinhos no estilo capture a bandeira 5 contra 5, com multiplayer online, servidor que decide as regras, várias salas e bots.",
    categoria: "jogo",
    image: "/projetos/carrinho-ctf-2.jpg",
    tech: "Phaser • TypeScript • Node • WebSocket",
    status: "development",
  },
  {
    id: "fazenda-viva",
    title: "Fazenda Viva",
    description: "Jogo 2D para navegador, feito com Phaser e TypeScript.",
    categoria: "jogo",
    image: "/projetos/fazenda-viva-2.jpg",
    tech: "Phaser • TypeScript • Vite",
    status: "development",
  },
  {
    id: "present-point",
    title: "Present Point",
    description:
      "Apresentador de letras de música ao vivo, com destaque palavra por palavra e janelas separadas para o operador e para a projeção.",
    categoria: "ferramenta",
    image: "/projetos/present-point-2.jpg",
    tech: "Electron • JavaScript",
    status: "development",
  },
  {
    id: "remote-control",
    title: "Remote Control",
    description:
      "Controle do computador pelo celular: servidor com instalador e ícone na bandeja do sistema, e aplicativo que se conecta a ele.",
    categoria: "ferramenta",
    image: "/projetos/remote-control-2.jpg",
    tech: "Python • Flask • Expo",
    privado: true,
  },
];

/** O showroom (em construção) só aparece quando NEXT_PUBLIC_SHOWROOM=1. */
export const projects: Project[] = todosOsProjetos.filter(
  (p) => p.id !== "showroom" || process.env.NEXT_PUBLIC_SHOWROOM === "1",
);
