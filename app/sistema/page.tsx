import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Baloes from "@/components/sistema/Baloes";
import css from "@/components/sistema/sistema.module.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif" });

const titulo = "Mapa do sistema da Paróquia Nossa Senhora Rainha";
const descricao =
  "Como os sistemas da paróquia se organizam: o que fica aberto na internet e o que fica dentro da paróquia.";

// Página solta: fora do sitemap, sem robots.txt (que revelaria o endereço) e com noindex.
// O título e a prévia de compartilhamento não herdam os do portfólio.
export const metadata: Metadata = {
  title: { absolute: titulo },
  description: descricao,
  alternates: { canonical: "/sistema" },
  robots: { index: false, follow: false },
  openGraph: {
    title: titulo,
    description: descricao,
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: titulo, description: descricao },
};

export default function PaginaSistema() {
  return (
    <main className={`${serif.variable} ${css.pagina}`}>
      <header className={css.cabecalho}>
        <div className={css.miolo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={css.logo40}
            src="/sistema-logo-40anos.png"
            alt="Logo dos 40 anos da Paróquia Nossa Senhora Rainha"
            width={118}
            height={118}
          />
          <div>
            <h1 className={css.titulo}>{titulo}</h1>
            <p className={css.lead}>
              Como os sistemas se organizam: o que fica aberto na internet e o
              que fica dentro da paróquia.
            </p>
          </div>
        </div>
      </header>
      <Baloes />
    </main>
  );
}
