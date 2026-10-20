import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ChatBubble from "@/components/ChatBubble";
import { site } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.nome,
  url: site.url,
  jobTitle: "Desenvolvedor full stack",
  description: site.descricao,
  email: site.contato.email,
  sameAs: [site.contato.linkedinUrl],
  knowsAbout: site.stack,
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <div aria-hidden className="h-16 bg-brand" />
      <main className="grow">{children}</main>
      <Footer />
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3 sm:right-6">
        <ScrollToTop />
        <ChatBubble />
      </div>
    </div>
  );
}
