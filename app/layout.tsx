import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata = {
  title: "Igor Arthur",
  description: "Portfólio profissional",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-black text-white min-h-screen flex flex-col">

        <Navbar />

        <main className="grow pt-28">
          {children}
        </main>

        <Footer />
      <ScrollToTop />
      </body>
    </html>
  );
}