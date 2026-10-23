import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { situacao, type Conexao, type Publicacao, type RedeId, type Situacao } from "@/lib/publicacoes";
import { idEpisodio, series } from "@/lib/series";
import FormPublicacao from "@/components/admin/FormPublicacao";
import PublicacaoItem from "@/components/admin/PublicacaoItem";
import ConexoesRedes from "@/components/admin/ConexoesRedes";

export const dynamic = "force-dynamic";
// "Publicar agora" espera o Instagram processar o vídeo (até cerca de 50 s)
export const maxDuration = 60;

const GRUPOS: { id: Situacao; titulo: string; ajuda: string }[] = [
  { id: "atencao", titulo: "Precisam de atenção", ajuda: "Com erro, ou com a hora já passada e algo ainda pendente." },
  { id: "agendada", titulo: "Agendadas", ajuda: "Saem sozinhas na data marcada (Instagram e YouTube)." },
  { id: "sem-data", titulo: "Sem data", ajuda: "Só saem quando você clica em Publicar agora." },
];

function Resumo({ n, rotulo, destaque }: { n: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${destaque && n > 0 ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}>
      <p className="text-2xl font-bold tracking-tight text-fg">{n}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </div>
  );
}

function Secao({
  titulo,
  ajuda,
  children,
  rotulo,
  aberta = true,
}: {
  titulo: string;
  ajuda?: string;
  children: React.ReactNode;
  rotulo: string;
  aberta?: boolean;
}) {
  return (
    <details open={aberta} className="group mb-8">
      <summary className="mb-4 flex cursor-pointer list-none items-baseline gap-3">
        <span className="text-xl font-bold text-fg">{titulo}</span>
        <span className="text-sm text-slate-500">{rotulo}</span>
        <span aria-hidden className="ml-auto text-slate-400 transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      {ajuda && <p className="-mt-2 mb-4 text-sm text-muted">{ajuda}</p>}
      {children}
    </details>
  );
}

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
  const faltaConectar = !conectadas.includes("instagram") || !conectadas.includes("youtube");

  const episodios = series.flatMap((s) =>
    s.episodios.map((e) => ({
      id: idEpisodio(s.slug, e.numero),
      rotulo: `${s.titulo}, Ep. ${e.numero}: ${e.titulo}`,
    })),
  );

  const todas = (data ?? []) as Publicacao[];
  const porGrupo = (g: Situacao) => todas.filter((p) => situacao(p) === g);
  const concluidas = porGrupo("concluida").reverse();

  const chip = (nome: string, ok: boolean) => (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {nome}: {ok ? "conectado" : "não conectado"}
    </span>
  );

  return (
    <section className="bg-page-2 px-6 pb-24 pt-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="eyebrow">Painel</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Publicações</h1>
          <p className="mt-1 text-sm text-muted">
            Um vídeo, todas as redes. Horários em Brasília. Episódios ligados a uma série aparecem no site sozinhos.
          </p>
        </div>

        {error ? (
          <p className="mb-10 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
            A tabela de publicações ainda não existe. Rode os arquivos em{" "}
            <code>supabase/migrations/</code> no SQL Editor do Supabase.
          </p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Resumo n={porGrupo("atencao").length} rotulo="Precisam de atenção" destaque />
              <Resumo n={porGrupo("agendada").length} rotulo="Agendadas" />
              <Resumo n={porGrupo("sem-data").length} rotulo="Sem data" />
              <Resumo n={concluidas.length} rotulo="Concluídas" />
            </div>

            <details open={faltaConectar} className="card group mb-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-6 py-4">
                <span className="font-semibold text-fg">Conexões</span>
                {chip("Instagram", conectadas.includes("instagram"))}
                {chip("YouTube", conectadas.includes("youtube"))}
                <span aria-hidden className="ml-auto text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <ConexoesRedes conexoes={conexoes} />
            </details>

            <details className="card group mb-10">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4">
                <span className="font-semibold text-fg">Nova publicação</span>
                <span aria-hidden className="ml-auto text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <FormPublicacao episodios={episodios} />
            </details>
          </>
        )}

        {todas.length === 0 && !error && (
          <div className="card mb-10 p-8 text-center text-slate-500">Nenhuma publicação ainda.</div>
        )}

        {GRUPOS.map((g) => {
          const itens = porGrupo(g.id);
          if (itens.length === 0) return null;
          return (
            <Secao key={g.id} titulo={g.titulo} ajuda={g.ajuda} rotulo={`${itens.length}`}>
              <ul className="space-y-4">
                {itens.map((p) => (
                  <PublicacaoItem key={p.id} p={p} conectadas={conectadas} />
                ))}
              </ul>
            </Secao>
          );
        })}

        {concluidas.length > 0 && (
          <Secao titulo="Concluídas" rotulo={`${concluidas.length}`} aberta={false}>
            <ul className="space-y-4">
              {concluidas.map((p) => (
                <PublicacaoItem key={p.id} p={p} conectadas={conectadas} />
              ))}
            </ul>
          </Secao>
        )}
      </div>
    </section>
  );
}
