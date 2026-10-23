import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MensagemItem, { type Mensagem } from "@/components/admin/MensagemItem";

export const dynamic = "force-dynamic";

export default async function MensagensPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const sp = await searchParams;
  const soNaoLidas = sp.f === "nao-lidas";
  const db = supabaseAdmin();
  if (!db) return <p className="px-6 pt-20 text-muted">Configure as variáveis do Supabase para ver o painel.</p>;

  const { data: msgs } = await db.from("mensagens").select("*").order("created_at", { ascending: false }).limit(200);
  const todas = (msgs ?? []) as Mensagem[];
  const naoLidas = todas.filter((m) => !m.lida).length;
  const mensagens = soNaoLidas ? todas.filter((m) => !m.lida) : todas;

  const chip = (ativo: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition ${
      ativo ? "bg-accent-strong text-white" : "text-muted hover:bg-slate-200 hover:text-fg"
    }`;

  return (
    <section className="bg-page-2 px-6 pb-24 pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Painel</p>
            <h1 className="text-3xl font-bold tracking-tight text-fg">Mensagens</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/admin/mensagens" className={chip(!soNaoLidas)}>
              Todas ({todas.length})
            </Link>
            <Link href="/admin/mensagens?f=nao-lidas" className={chip(soNaoLidas)}>
              Não lidas ({naoLidas})
            </Link>
          </div>
        </div>

      {mensagens.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {soNaoLidas ? "Nenhuma mensagem nova." : "Nenhuma mensagem ainda."}
        </div>
      ) : (
        <ul className="space-y-4">
          {mensagens.map((m) => (
            <MensagemItem key={m.id} m={m} />
          ))}
        </ul>
      )}
      </div>
    </section>
  );
}
