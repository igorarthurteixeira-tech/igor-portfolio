import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ComentarioItem, { type ComentarioSerie } from "@/components/admin/ComentarioItem";
import { idEpisodio, series } from "@/lib/series";

export const dynamic = "force-dynamic";

const PERIODOS = [7, 30, 90] as const;

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86400000);
}

export default async function SeriePainelPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const sp = await searchParams;
  const dias = PERIODOS.find((p) => String(p) === sp.d) ?? 30;
  const db = supabaseAdmin();
  if (!db) return <p className="px-6 pt-20 text-muted">Configure as variáveis do Supabase para ver o painel.</p>;

  const [{ data: ev }, curtidasSerie, comentariosSerie] = await Promise.all([
    db
      .from("eventos")
      .select("alvo")
      .eq("tipo", "click")
      .like("alvo", "serie:%")
      .gte("created_at", diasAtras(dias).toISOString())
      .limit(20000),
    db.from("serie_curtidas").select("episodio").limit(50000),
    db.from("serie_comentarios").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const cliques = (ev ?? []) as { alvo: string | null }[];

  const serieIndisponivel = !!curtidasSerie.error || !!comentariosSerie.error;
  const curtidasPorEp = new Map<string, number>();
  for (const l of (curtidasSerie.data ?? []) as { episodio: string }[]) {
    curtidasPorEp.set(l.episodio, (curtidasPorEp.get(l.episodio) ?? 0) + 1);
  }
  const comentariosSerieLista = (comentariosSerie.data ?? []) as ComentarioSerie[];
  const linhasSerie = series.flatMap((s) =>
    s.episodios.map((e) => {
      const id = idEpisodio(s.slug, e.numero);
      const dosEp = comentariosSerieLista.filter((c) => c.episodio === id);
      return {
        id,
        rotulo: `${s.titulo} · Ep. ${e.numero}`,
        titulo: e.titulo,
        aberturas: cliques.filter((c) => c.alvo === `serie:${s.slug}:${e.numero}:abrir`).length,
        plays: cliques.filter((c) => c.alvo === `serie:${s.slug}:${e.numero}:play`).length,
        curtidas: curtidasPorEp.get(id) ?? 0,
        aprovados: dosEp.filter((c) => c.aprovado).length,
        pendentes: dosEp.filter((c) => !c.aprovado).length,
      };
    }),
  );
  const totSerie = {
    plays: linhasSerie.reduce((a, l) => a + l.plays, 0),
    curtidas: linhasSerie.reduce((a, l) => a + l.curtidas, 0),
    comentarios: linhasSerie.reduce((a, l) => a + l.aprovados, 0),
    pendentes: linhasSerie.reduce((a, l) => a + l.pendentes, 0),
  };
  const rotuloEp = new Map(linhasSerie.map((l) => [l.id, l.rotulo]));
  const comentariosOrdenados = [...comentariosSerieLista].sort(
    (a, b) => Number(a.aprovado) - Number(b.aprovado),
  );

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
            <h1 className="text-3xl font-bold tracking-tight text-fg">Série</h1>
            <p className="mt-1 text-sm text-muted">
              Cliques nos episódios (no período), curtidas e comentários (total).
            </p>
          </div>
          <div className="flex items-center gap-1">
            {PERIODOS.map((p) => (
              <Link key={p} href={`/admin/serie?d=${p}`} className={chip(p === dias)}>
                {p} dias
              </Link>
            ))}
          </div>
        </div>

      {serieIndisponivel ? (
        <p className="mb-6 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
          As tabelas de curtidas e comentários ainda não existem no banco. Rode o arquivo{" "}
          <code>supabase/migrations/20261022000000_serie_vida_de_dono.sql</code> no SQL Editor do
          Supabase.
        </p>
      ) : (
        <div className="mb-6">
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Plays", totSerie.plays],
              ["Curtidas", totSerie.curtidas],
              ["Comentários aprovados", totSerie.comentarios],
              ["Comentários aguardando", totSerie.pendentes],
            ].map(([titulo, valor]) => (
              <div key={String(titulo)} className="card p-5">
                <p className="text-3xl font-bold tracking-tight text-fg">
                  {Number(valor).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-sm text-muted">{titulo}</p>
              </div>
            ))}
          </div>

          <div className="card mb-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Episódio</th>
                  <th className="px-3 py-3 text-right font-semibold">Aberturas</th>
                  <th className="px-3 py-3 text-right font-semibold">Plays</th>
                  <th className="px-3 py-3 text-right font-semibold">Curtidas</th>
                  <th className="px-5 py-3 text-right font-semibold">Comentários</th>
                </tr>
              </thead>
              <tbody>
                {linhasSerie.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-medium text-fg">{l.titulo}</span>
                      <span className="block text-xs text-slate-500">{l.rotulo}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted">{l.aberturas}</td>
                    <td className="px-3 py-3 text-right text-muted">{l.plays}</td>
                    <td className="px-3 py-3 text-right text-muted">{l.curtidas}</td>
                    <td className="px-5 py-3 text-right text-muted">
                      {l.aprovados}
                      {l.pendentes > 0 && (
                        <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          +{l.pendentes} novo{l.pendentes > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comentariosOrdenados.length > 0 && (
            <>
              <p className="mb-3 text-sm font-medium text-fg">Comentários</p>
              <ul className="space-y-3">
                {comentariosOrdenados.slice(0, 60).map((c) => (
                  <ComentarioItem key={c.id} c={c} rotulo={rotuloEp.get(c.episodio) ?? c.episodio} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      </div>
    </section>
  );
}
