import Link from "next/link";
import { site } from "@/lib/site";

const social = [
  { label: "E-mail", href: `mailto:${site.contato.email}` },
  { label: "WhatsApp", href: site.contato.whatsappUrl },
  { label: "LinkedIn", href: site.contato.linkedinUrl },
];

const nav = [
  { label: "Sobre", href: "/#sobre" },
  { label: "Projetos", href: "/projetos" },
  { label: "Formação", href: "/#formacao" },
];

export default function Footer() {
  const externo = (href: string) =>
    href.startsWith("http")
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};

  return (
    <footer className="border-t-2 border-accent bg-brand px-6 pb-10 pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Igor Arthur
            </h3>
            <p className="max-w-sm text-sm leading-relaxed text-slate-300">
              Desenvolvo sistemas sob medida, automações e aplicações web para
              empresas.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
              Contato
            </h4>
            <ul className="space-y-3 text-sm text-slate-300">
              {social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    {...externo(s.href)}
                    className="transition hover:text-white"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
              Navegação
            </h4>
            <ul className="space-y-3 text-sm text-slate-300">
              {nav.map((n) => (
                <li key={n.label}>
                  <Link href={n.href} className="transition hover:text-white">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/15 pt-6 text-xs text-slate-400 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Igor Arthur. Todos os direitos
            reservados.
          </span>
          <span>Feito com Next.js e Tailwind</span>
        </div>
      </div>
    </footer>
  );
}
