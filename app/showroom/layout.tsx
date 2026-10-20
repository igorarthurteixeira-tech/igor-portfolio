import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Barlow, Oswald } from "next/font/google";
import CabecalhoLoja from "@/components/showroom/CabecalhoLoja";
import Marca from "@/components/showroom/Marca";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600"] });
const barlow = Barlow({ subsets: ["latin"], variable: "--font-barlow", weight: ["400", "500", "600", "700"] });

// o showroom é "outro site": a barra do navegador acompanha a faixa preta do topo
export const viewport: Viewport = { themeColor: "#000000" };

// Outro site: título, descrição e prévia próprios (nada do portfólio).
export const metadata: Metadata = {
  title: { default: "Vértice Motors | Seminovos selecionados", template: "%s | Vértice Motors" },
  description:
    "Vértice Motors: seminovos selecionados, com procedência, garantia e financiamento facilitado. (Site de demonstração, empresa fictícia.)",
  alternates: { canonical: "/showroom" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Vértice Motors",
    description: "Seminovos selecionados, com procedência e garantia.",
    siteName: "Vértice Motors",
    images: [],
    type: "website",
  },
  twitter: { card: "summary", title: "Vértice Motors", description: "Seminovos selecionados.", images: [] },
};

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${oswald.variable} ${barlow.variable} showroom flex min-h-screen flex-col bg-page text-fg`}>
      {/* única referência ao portfólio: uma fita fina de aviso */}
      <div className="bg-black px-4 py-1.5 text-center text-xs text-slate-300">
        Site de demonstração, com empresa e veículos fictícios, criado por Igor Arthur.{" "}
        <Link href="/projetos" className="font-semibold text-white underline underline-offset-2">
          Voltar ao portfólio
        </Link>
      </div>

      <CabecalhoLoja />
      <main className="grow">{children}</main>

      <footer id="contato" className="bg-brand text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Marca claro />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
              Seminovos selecionados, com laudo cautelar, procedência conferida e seis meses de garantia.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm uppercase tracking-[0.2em] text-white">Atendimento</h3>
            <ul className="space-y-2 text-sm">
              <li>(00) 0000-0000</li>
              <li>contato@verticemotors.exemplo</li>
              <li>Seg a sex, 9h às 18h</li>
              <li>Sábado, 9h às 13h</li>
            </ul>
          </div>
          <div id="loja">
            <h3 className="mb-4 text-sm uppercase tracking-[0.2em] text-white">A loja</h3>
            <ul className="space-y-2 text-sm">
              <li>Av. Exemplo, 1000</li>
              <li>Bairro Exemplo, Cidade Exemplo - UF</li>
              <li>CEP 00000-000</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
          © Vértice Motors. Empresa, marcas e veículos fictícios, para demonstração.
          <br />
          Modelo 3D &ldquo;CarConcept&rdquo;: Eric Chadwick e Darmstadt Graphics Group GmbH,{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" className="underline" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          , a partir de obra de domínio público de Unity Fan.
        </div>
      </footer>
    </div>
  );
}
