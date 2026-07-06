import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata = {
  metadataBase: new URL("https://igorarthurdev.com.br"),
  title: "Igor Arthur",
  description:
    "Análise, arquitetura e construção de sistemas. Consultoria de fluxo, automação e programação full stack.",
  openGraph: {
    title: "Igor Arthur",
    description:
      "Análise, arquitetura e construção de sistemas. Consultoria de fluxo, automação e programação full stack.",
    url: "https://igorarthurdev.com.br",
    siteName: "Igor Arthur",
    images: ["/banner.jpg"],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Igor Arthur",
    description:
      "Análise, arquitetura e construção de sistemas. Consultoria de fluxo, automação e programação full stack.",
    images: ["/banner.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col bg-black text-white">
        <Navbar />
        <main className="grow pt-28">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
