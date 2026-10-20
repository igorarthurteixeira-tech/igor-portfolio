/**
 * Dados de demonstração do showroom.
 * Marcas e modelos são FICTÍCIOS. As fotos (public/showroom) foram geradas por
 * IA. Atenção: algumas lembram modelos reais.
 */
export type Carroceria = "hatch" | "sedan" | "suv" | "picape" | "esportivo";

export const carrocerias: { id: Carroceria; nome: string }[] = [
  { id: "hatch", nome: "Hatch" },
  { id: "sedan", nome: "Sedã" },
  { id: "suv", nome: "SUV" },
  { id: "picape", nome: "Picape" },
  { id: "esportivo", nome: "Esportivo" },
];

export type Carro = {
  id: string;
  marca: string;
  modelo: string;
  versao: string;
  ano: number;
  km: number;
  preco: number;
  cambio: "Manual" | "Automático";
  combustivel: "Flex" | "Gasolina" | "Diesel" | "Elétrico" | "Híbrido";
  carroceria: Carroceria;
  cor: { nome: string; hex: string };
  cidade: string;
  opcionais: string[];
  descricao: string;
  destaque?: boolean;
  vendido?: boolean;
  /** Fotos (caminhos em /public ou data URLs do painel). Sem fotos, mostra "Foto em breve". */
  fotos?: string[];
};

export const carrosDemo: Carro[] = [
  {
    id: "aurora-citta",
    marca: "Aurora",
    modelo: "Citta",
    versao: "1.0 Conforto",
    ano: 2023,
    km: 18400,
    preco: 62900,
    cambio: "Manual",
    combustivel: "Flex",
    carroceria: "hatch",
    cor: { nome: "Prata Titânio", hex: "#a3a6ab" },
    cidade: "Cidade Exemplo",
    opcionais: ["Ar-condicionado", "Direção elétrica", "Central multimídia", "Sensor de ré"],
    descricao:
      "Compacto econômico, ideal para o dia a dia na cidade. Único dono, revisões em dia e baixa quilometragem.",
    fotos: ["/showroom/aurora-citta-1.jpg", "/showroom/aurora-citta-2.jpg"]
  },
  {
    id: "vento-lume",
    marca: "Vento",
    modelo: "Lume",
    versao: "1.6 Premium",
    ano: 2022,
    km: 32100,
    preco: 98500,
    cambio: "Automático",
    combustivel: "Flex",
    carroceria: "sedan",
    cor: { nome: "Prata Lunar", hex: "#aab2bd" },
    cidade: "Cidade Exemplo",
    opcionais: ["Câmbio automático", "Bancos de couro", "Câmera de ré", "Piloto automático", "Teto solar"],
    descricao:
      "Sedã confortável e silencioso, com acabamento premium e porta-malas amplo. Excelente para viagens.",
    destaque: true,
    fotos: ["/showroom/vento-lume-1.jpg", "/showroom/vento-lume-2.jpg"]
  },
  {
    id: "terra-serra",
    marca: "Terra",
    modelo: "Serra",
    versao: "2.0 Turbo 4x4",
    ano: 2024,
    km: 9800,
    preco: 189900,
    cambio: "Automático",
    combustivel: "Diesel",
    carroceria: "suv",
    cor: { nome: "Cinza Chumbo", hex: "#4f545d" },
    cidade: "Cidade Exemplo",
    opcionais: ["Tração 4x4", "7 lugares", "Faróis em LED", "Teto panorâmico", "Assistente de faixa"],
    descricao:
      "SUV robusto de 7 lugares, tração integral e muito espaço. Pronto para estrada e para a família.",
    destaque: true,
    fotos: ["/showroom/terra-serra-1.jpg", "/showroom/terra-serra-2.jpg", "/showroom/terra-serra-3.jpg"]
  },
  {
    id: "forte-rota",
    marca: "Forte",
    modelo: "Rota",
    versao: "2.8 Cabine Dupla",
    ano: 2021,
    km: 58700,
    preco: 164000,
    cambio: "Manual",
    combustivel: "Diesel",
    carroceria: "picape",
    cor: { nome: "Cinza Grafite", hex: "#4a5260" },
    cidade: "Cidade Exemplo",
    opcionais: ["Caçamba com protetor", "Tração 4x4", "Estribo lateral", "Engate"],
    descricao:
      "Picape de trabalho e lazer, resistente e econômica para o porte. Manutenção feita na concessionária.",
    fotos: ["/showroom/forte-rota-1.jpg", "/showroom/forte-rota-2.jpg", "/showroom/forte-rota-3.jpg"]
  },
];

export const marcasDemo = [...new Set(carrosDemo.map((c) => c.marca))].sort();
