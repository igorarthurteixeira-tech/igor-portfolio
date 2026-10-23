import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { concluida, type Conexao, type Publicacao, type RedeId } from "@/lib/publicacoes";
import FormPublicacao from "@/components/admin/FormPublicacao";
import PublicacaoItem from "@/components/admin/PublicacaoItem";
import ConexoesRedes from "@/components/admin/ConexoesRedes";
import { idEpisodio, series } from "@/lib/series";

export const dynamic = "force-dynamic";
// "Publicar agora" espera o Instagram processar o vídeo (até cerca de 50 s)
export const maxDuration = 60;

export default async function PublicacoesPage() {
  if (!(await getAdminUser())) redirect("/admin/login");

  const db = supabaseAdmin();
  const { data, error } = db
    ? await db
        .from("publicacoes")
        .select("*")
        .order("agendada_em", { ascending: true, nullsFirst: false })
        .limit(300)
    : { data: null, error: { message: "sem banco" } };

  // O token nunca sai do servidor: só nome da conta e validade vão para a tela.
  const { data: con } = db
    ? await db.from("redes_conexoes").select("rede,conta_nome,expira_em")
    : { data: null };
  const conexoes = (con ?? []) as Conexao[];
  const conectadas = conexoes.map((c) => c.rede as RedeId);

  const episodios = series.flatMap((s) =>
    s.episodios.map((e) => ({
      id: idEpisodio(s.slug, e.numero),
      rotulo: `${s.titulo}, Ep. ${e.numero}: ${e.titulo}`,
    })),
  );

  const todas = (data ?? []) as Publicacao[];
  const abertas = todas.filter((p) => !concluida(p));
  const feitas = todas.filter(concluida).reverse();

  return (
    <section className="bg-page px-5 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Painel</p>
            <h1 className="text-3xl font-bold tracking-tight text-fg">Publicações</h1>
            <p className="mt-1 text-sm text-muted">
              Fila de vídeos e textos para as redes. Horários em Brasília.
            </p>
          </div>
          <Link href="/admin" className="btn-outline px-4! py-2!">
            ← Painel
          </Link>
        </div>

        {error ? (
          <p className="mb-10 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
            A tabela de publicações ainda não existe. Rode os arquivos{" "}
            <code>supabase/migrations/20261022010000_publicacoes.sql</code> e{" "}
            <code>supabase/migrations/20261023000000_redes_conexoes.sql</code> no SQL Editor do
            Supabase.
          </p>
        ) : (
          <>
            <ConexoesRedes conexoes={conexoes} />
            <FormPublicacao episodios={episodios} />
          </>
        )}

        <h2 className="mb-4 text-xl font-bold text-fg">Na fila ({abertas.length})</h2>
        {abertas.length === 0 ? (
          <div className="card mb-10 p-8 text-center text-slate-500">Nenhuma publicação na fila.</div>
        ) : (
          <ul className="mb-10 space-y-4">
            {abertas.map((p) => (
              <PublicacaoItem key={p.id} p={p} conectadas={conectadas} />
            ))}
          </ul>
        )}

        {feitas.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-bold text-fg">Concluídas ({feitas.length})</h2>
            <ul className="space-y-4">
              {feitas.map((p) => (
                <PublicacaoItem key={p.id} p={p} conectadas={conectadas} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
