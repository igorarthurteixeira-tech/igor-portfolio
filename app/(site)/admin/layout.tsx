import type { Metadata } from "next";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminNav, { type Contagens } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

/** Números que aparecem nas abas: o que está esperando alguma ação sua. */
async function contagens(): Promise<Contagens> {
  const db = supabaseAdmin();
  if (!db) return { publicacoes: 0, serie: 0, mensagens: 0 };
  const agora = new Date().toISOString();
  const [msgs, coms, pubs] = await Promise.all([
    db.from("mensagens").select("*", { count: "exact", head: true }).eq("lida", false),
    db.from("serie_comentarios").select("*", { count: "exact", head: true }).eq("aprovado", false),
    db.from("publicacoes").select("status_redes,agendada_em").limit(300),
  ]);
  const precisaAtencao = (pubs.data ?? []).filter((p) => {
    const st = Object.values((p.status_redes ?? {}) as Record<string, string>);
    const atrasada = !!p.agendada_em && p.agendada_em < agora && st.some((s) => s === "pendente");
    return st.includes("erro") || atrasada;
  }).length;
  return { publicacoes: precisaAtencao, serie: coms.count ?? 0, mensagens: msgs.count ?? 0 };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  return (
    <>
      {user && <AdminNav email={user.email ?? ""} contagens={await contagens()} />}
      {children}
    </>
  );
}
