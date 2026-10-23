"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/(site)/admin/actions";

export type Contagens = { publicacoes: number; serie: number; mensagens: number };

const ABAS = [
  { href: "/admin", rotulo: "Visão geral", chave: null },
  { href: "/admin/publicacoes", rotulo: "Publicações", chave: "publicacoes" },
  { href: "/admin/serie", rotulo: "Série", chave: "serie" },
  { href: "/admin/mensagens", rotulo: "Mensagens", chave: "mensagens" },
] as const;

export default function AdminNav({ email, contagens }: { email: string; contagens: Contagens }) {
  const caminho = usePathname();
  const ativa = (href: string) => (href === "/admin" ? caminho === "/admin" : caminho.startsWith(href));

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <nav aria-label="Painel" className="flex flex-wrap items-center gap-1">
          {ABAS.map((a) => {
            const n = a.chave ? contagens[a.chave] : 0;
            return (
              <Link
                key={a.href}
                href={a.href}
                aria-current={ativa(a.href) ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  ativa(a.href) ? "bg-accent-strong text-white" : "text-muted hover:bg-slate-100 hover:text-fg"
                }`}
              >
                {a.rotulo}
                {n > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      ativa(a.href) ? "bg-white text-accent-strong" : "bg-amber-500 text-white"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <Link href="/" className="font-medium text-muted hover:text-fg">
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
