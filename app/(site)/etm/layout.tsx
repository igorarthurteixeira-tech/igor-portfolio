import type { Metadata } from "next";
import Link from "next/link";
import { getEtmUser } from "@/lib/etm-servidor";
import { sairEtm } from "./actions";

export const metadata: Metadata = {
  title: "Pedidos de vídeo · ETM",
  robots: { index: false, follow: false },
};

export default async function EtmLayout({ children }: { children: React.ReactNode }) {
  const user = await getEtmUser();
  return (
    <>
      {user && (
        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-2.5 text-sm">
            <Link href="/etm" className="font-semibold text-fg">Pedidos de vídeo · ETM</Link>
            <div className="flex items-center gap-4">
              {user.admin && (
                <Link href="/admin/etm" className="font-semibold text-accent-strong hover:underline">Voltar ao painel</Link>
              )}
              <span className="hidden text-muted sm:inline">{user.nome}</span>
              <form action={sairEtm}>
                <button className="font-medium text-muted hover:text-fg">Sair</button>
              </form>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
