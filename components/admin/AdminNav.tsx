"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/(site)/admin/actions";

export type Contagens = { publicacoes: number; serie: number; mensagens: number };

const ICONES = {
  geral: "M4 20V10m6 10V4m6 16v-7m6 7H2",
  publicacoes: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  serie: "M5 3l14 9-14 9V3z",
  mensagens: "M3 6h18v12H3zM3 7l9 6 9-6",
} as const;

const ABAS = [
  { href: "/admin", rotulo: "Visão geral", chave: null, icone: ICONES.geral },
  { href: "/admin/publicacoes", rotulo: "Publicações", chave: "publicacoes", icone: ICONES.publicacoes },
  { href: "/admin/serie", rotulo: "Série", chave: "serie", icone: ICONES.serie },
  { href: "/admin/mensagens", rotulo: "Mensagens", chave: "mensagens", icone: ICONES.mensagens },
] as const;

export default function AdminNav({ email, contagens }: { email: string; contagens: Contagens }) {
  const caminho = usePathname();
  const ativa = (href: string) => (href === "/admin" ? caminho === "/admin" : caminho.startsWith(href));

  return (
    <div className="sticky top-16 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <nav
          aria-label="Painel"
          className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ABAS.map((a) => {
            const n = a.chave ? contagens[a.chave] : 0;
            const atual = ativa(a.href);
            return (
              <Link
                key={a.href}
                href={a.href}
                aria-current={atual ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  atual ? "bg-accent-strong text-white shadow-sm" : "text-muted hover:bg-slate-100 hover:text-fg"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={a.icone} />
                </svg>
                {a.rotulo}
                {n > 0 && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                      atual ? "bg-white text-accent-strong" : "bg-amber-500 text-white"
                    }`}
                    aria-label={`${n} pendente${n > 1 ? "s" : ""}`}
                  >
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-3 border-l border-line pl-3 text-sm">
          <span className="hidden max-w-50 truncate text-slate-500 lg:inline" title={email}>
            {email}
          </span>
          <Link href="/" className="hidden font-medium text-muted hover:text-fg sm:inline">
            Ver site
          </Link>
          <form action={sair}>
            <button className="font-medium text-muted hover:text-fg">Sair</button>
          </form>
        </div>
      </div>
    </div>
  );
}
