/**
 * Séries de ficção do portfólio ("Vida de Dono").
 * Para adicionar um episódio: inclua um item em `episodios` e, quando o vídeo
 * estiver no YouTube, preencha `youtubeId` (a parte depois de `v=` ou de `/shorts/`).
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
  /**
   * Quando o episódio estreia (horário de Brasília). Até lá o site mostra "Em breve",
   * e depois passa a tocar sozinho, sem precisar publicar o site de novo.
   */
  estreia?: string;
};

export type Serie = {
  slug: string;
  titulo: string;
  chamada: string;
  descricao: string;
  capa: string;
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
    destaque: true,
    episodios: [
      {
        numero: 1,
        titulo: "Salvando… 99%",
        resumo:
          "A planilha trava, o Seu Sérgio jura que funciona e a gerente ameaça o emprego da Camila.",
        duracao: "1:27",
        poster: "/series/expediente-ep1.jpg",
        youtubeId: "PXUjhoaBLAc",
        estreia: "2026-10-26T12:00:00-03:00",
      },
      {
        numero: 2,
        titulo: "O gargalo",
        resumo:
          "Trezentas e oitenta linhas copiadas à mão, três versões do mesmo arquivo e uma mensagem enviada ao grupo errado.",
        duracao: "1:34",
        poster: "/series/expediente-ep2.jpg",
        youtubeId: "6j9W1KLeRVg",
        estreia: "2026-10-27T12:00:00-03:00",
      },
      {
        numero: 3,
        titulo: "A cagada",
        resumo:
          "Faltam dois minutos para o prazo e o Kevin apaga o arquivo. O dono demite o estagiário, que nem registro tem.",
        duracao: "1:20",
        poster: "/series/expediente-ep3.jpg",
        youtubeId: "WhVoCdjMuxI",
        estreia: "2026-10-28T12:00:00-03:00",
      },
      {
        numero: 4,
        titulo: "Pânico",
        resumo:
          "O backup é de março, o cliente cancela e o dono demite todo mundo. Menos o Tadeu, calmo demais.",
        duracao: "1:26",
        poster: "/series/expediente-ep4.jpg",
        youtubeId: "mEFsOHM3HrA",
        estreia: "2026-10-29T12:00:00-03:00",
      },
      {
        numero: 5,
        titulo: "Estava tudo salvo",
        resumo:
          "O Tadeu mostra o chamado que o dono arquivou em março e o sistema que guardou tudo até 17h57.",
        duracao: "1:38",
        poster: "/series/expediente-ep5.jpg",
        youtubeId: "XpmIJAQkfaY",
        estreia: "2026-10-30T12:00:00-03:00",
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
    episodios: [
      {
        numero: 1,
        titulo: "A planilha que só o Marcelo entendia",
        resumo:
          "O Marcelo está de férias, a senha é “a mesma de sempre” e o Beto, o primo da informática, resolve ajudar.",
        duracao: "1:21",
        poster: "/series/padaria-da-rosa-ep1.jpg",
        youtubeId: "mGCOHBN4x1o",
        estreia: "2026-10-23T12:00:00-03:00",
        arquivoLocal: "/series/padaria-da-rosa-ep1.mp4",
      },
      {
        numero: 2,
        titulo: "Um sistema de verdade",
        resumo:
          "A Rosa desabafa com uma amiga, descobre que dá para testar um sistema antes de pagar e a equipe reage.",
        duracao: "1:22",
        poster: "/series/padaria-da-rosa-ep2.jpg",
        youtubeId: "8R_jQ2GmJpA",
        estreia: "2026-10-24T12:00:00-03:00",
        arquivoLocal: "/series/padaria-da-rosa-ep2.mp4",
      },
      {
        numero: 3,
        titulo: "O caderninho do fiado",
        resumo:
          "O Seu Zé jura que pagou, o caderninho do fiado está encharcado de café e o Beto, claro, tenta ajudar.",
        duracao: "0:48",
        poster: "/series/padaria-da-rosa-ep3.jpg",
        youtubeId: "jr08LS6VxAE",
        estreia: "2026-10-25T12:00:00-03:00",
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
