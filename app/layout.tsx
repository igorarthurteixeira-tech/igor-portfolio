import "./globals.css";
import { Geist } from "next/font/google";
import Tracker from "@/components/Tracker";
import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Igor Arthur | Sistemas sob medida",
    template: "%s | Igor Arthur",
  },
  alternates: { canonical: "/" },
  description: site.descricao,
  openGraph: {
    title: "Igor Arthur",
    description: site.descricao,
    url: site.url,
    siteName: "Igor Arthur",
    images: ["/banner.jpg"],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Igor Arthur",
    description: site.descricao,
    images: ["/banner.jpg"],
  },
};

// cor da barra do navegador (celular) e das abas: igual ao menu escuro do site
export const viewport: Viewport = {
  themeColor: "#040716",
  colorScheme: "light",
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className={geist.variable}>
        {children}
        <Tracker />
      </body>
    </html>
  );
}
