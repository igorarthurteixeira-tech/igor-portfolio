/**
 * Séries de ficção do portfólio ("Vida de Dono").
 * Para adicionar um episódio: inclua um item em `episodios` e, quando o vídeo
 * estiver no YouTube, o painel de Publicações liga o vídeo ao episódio (campo "Episódio da série").
 */

/** Curtidas e comentários só aparecem em números a partir destes valores. */
export const MIN_CURTIDAS_EXIBIDAS = 10;
export const MIN_COMENTARIOS_EXIBIDOS = 5;

export type Episodio = {
  numero: number;
  titulo: string;
  resumo: string;
  duracao: string;
  /** Imagem vertical (9:16) usada no cartão e antes do play. */
  poster: string;
  /** ID do vídeo no YouTube. Sem ele o episódio aparece como "Em breve". */
  youtubeId?: string;
  /** Arquivo local, usado só no desenvolvimento enquanto o vídeo não está no YouTube. */
  arquivoLocal?: string;
  /** Preenchido a partir do painel de Publicações: data prevista, enquanto o episódio não está no ar. */
  estreia?: string;
  /** Preenchido a partir do painel: quando o episódio foi (ou será) publicado. */
  quando?: string;
};

export type ChatMsg = {
  autor?: string;
  cargo?: string;
  texto: string;
  /** "in" = mensagem recebida (branca); "out" = enviada (verde). */
  lado: "in" | "out";
  /** Anexo (ex.: arquivo), desenhado como etiqueta em vez de balão. */
  arquivo?: boolean;
};

/** Conversa que roda animada na capa da página da série. */
export type ChatSerie = { titulo: string; icone: string; mensagens: ChatMsg[] };

export type Serie = {
  slug: string;
  titulo: string;
  chamada: string;
  descricao: string;
  capa: string;
  /** Só a ilustração (sem título nem datas), para o fundo do topo da página da série. */
  arte?: string;
  /** Chat animado do topo da página (tem prioridade sobre `arte`). */
  chat?: ChatSerie;
  /** Texto de agenda (ex.: "Episódios todos os dias às 12h"), editado no painel de Publicações. */
  agenda?: string;
  /** Série em destaque na home (maior, com selo "Nova série"). */
  destaque?: boolean;
  episodios: Episodio[];
};

export const series: Serie[] = [
  {
    slug: "expediente",
    titulo: "Expediente",
    chamada: "Uma planilha, seis pessoas e zero backup.",
    descricao:
      "Num escritório comum, uma planilha que ninguém ousa trocar trava, perde dados e atrasa as entregas. Entre a gerente, o dono, o estagiário e o criador da planilha, só o TI parece calmo. Cinco episódios de confusão, ameaças de demissão e uma virada.",
    capa: "/series/expediente-capa.jpg",
    arte: "/series/expediente-arte.jpg",
    chat: {
      titulo: "Equipe",
      icone: "🏢",
      mensagens: [
        { autor: "Sr. Augusto", cargo: "Dono", texto: "Relatório até as 18h. Sem desculpa.", lado: "in" },
        { autor: "Camila", cargo: "RH", texto: "A planilha TRAVOU. Perdi tudo.", lado: "out" },
        { autor: "Seu Sérgio", cargo: "Analista sênior", texto: "Funciona na minha máquina.", lado: "in" },
        { autor: "Patrícia", cargo: "Gerente", texto: "VOCÊ ESTÁ DEMITIDO.", lado: "in" },
        { texto: "RELATORIO_FINAL.xlsx · 0 KB", lado: "in", arquivo: true },
      ],
    },
    destaque: true,
    episodios: [
      {
        numero: 1,
        titulo: "Salvando… 99%",
        resumo:
          "A planilha trava, o Seu Sérgio jura que funciona e a gerente ameaça o emprego da Camila.",
        duracao: "1:27",
        poster: "/series/expediente-ep1-capa.jpg",
      },
      {
        numero: 2,
        titulo: "O gargalo",
        resumo:
          "Trezentas e oitenta linhas copiadas à mão, três versões do mesmo arquivo e uma mensagem enviada ao grupo errado.",
        duracao: "1:34",
        poster: "/series/expediente-ep2-capa.jpg",
      },
      {
        numero: 3,
        titulo: "A cagada",
        resumo:
          "Faltam dois minutos para o prazo e o Kevin apaga o arquivo. O dono demite o estagiário, que nem registro tem.",
        duracao: "1:20",
        poster: "/series/expediente-ep3-capa.jpg",
      },
      {
        numero: 4,
        titulo: "Pânico",
        resumo:
          "O backup é de março, o cliente cancela e o dono demite todo mundo. Menos o Tadeu, calmo demais.",
        duracao: "1:26",
        poster: "/series/expediente-ep4-capa.jpg",
      },
      {
        numero: 5,
        titulo: "Estava tudo salvo",
        resumo:
          "O Tadeu mostra o chamado que o dono arquivou em março e o sistema que guardou tudo até 17h57.",
        duracao: "1:38",
        poster: "/series/expediente-ep5-capa.jpg",
      },
    ],
  },
  {
    slug: "padaria-da-rosa",
    titulo: "A Padaria da Rosa",
    chamada: "Planilha apagada, senha esquecida e um Marcelo na praia.",
    descricao:
      "A Rosa toca uma padaria de bairro com uma equipe cheia de boas intenções e de problemas muito reais. Cada episódio é uma confusão que qualquer dono de negócio reconhece.",
    capa: "/series/padaria-da-rosa-capa.jpg",
    arte: "/series/padaria-da-rosa-arte.jpg",
    chat: {
      titulo: "Padaria da Rosa",
      icone: "🥖",
      mensagens: [
        { texto: "Alguém sabe a senha??", lado: "out" },
        { texto: "Tá num post-it", lado: "in" },
        { texto: "Apaguei a aba 😬", lado: "in" },
        { texto: "BETO.", lado: "out" },
      ],
    },
    episodios: [
      {
        numero: 1,
        titulo: "A planilha que só o Marcelo entendia",
        resumo:
          "O Marcelo está de férias, a senha é “a mesma de sempre” e o Beto, o primo da informática, resolve ajudar.",
        duracao: "1:21",
        poster: "/series/padaria-da-rosa-ep1-capa.jpg",
        arquivoLocal: "/series/padaria-da-rosa-ep1.mp4",
      },
      {
        numero: 2,
        titulo: "Um sistema de verdade",
        resumo:
          "A Rosa desabafa com uma amiga, descobre que dá para testar um sistema antes de pagar e a equipe reage.",
        duracao: "1:22",
        poster: "/series/padaria-da-rosa-ep2-capa.jpg",
        arquivoLocal: "/series/padaria-da-rosa-ep2.mp4",
      },
      {
        numero: 3,
        titulo: "O caderninho do fiado",
        resumo:
          "O Seu Zé jura que pagou, o caderninho do fiado está encharcado de café e o Beto, claro, tenta ajudar.",
        duracao: "0:48",
        poster: "/series/padaria-da-rosa-ep3-capa.jpg",
        arquivoLocal: "/series/padaria-da-rosa-ep3.mp4",
      },
    ],
  },
];

export const idEpisodio = (serie: string, numero: number) => `${serie}:${numero}`;

export function acharSerie(slug: string) {
  return series.find((s) => s.slug === slug);
}

/** Todos os IDs de episódio válidos (usado para validar as APIs). */
export function idsValidos() {
  return new Set(
    series.flatMap((s) => s.episodios.map((e) => idEpisodio(s.slug, e.numero))),
  );
}

/** O episódio já pode ser assistido? (tem vídeo e a data de estreia já passou) */
export function estaDisponivel(ep: Episodio, agora: number, producao: boolean) {
  const temVideo = !!ep.youtubeId || (!producao && !!ep.arquivoLocal);
  if (!temVideo) return false;
  if (ep.estreia && agora < Date.parse(ep.estreia)) return false;
  return true;
}

/** "23/10", no fuso de Brasília. */
export function diaDaEstreia(ep: Episodio) {
  if (!ep.estreia) return null;
  return new Date(ep.estreia).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}
