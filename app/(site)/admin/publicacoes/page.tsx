import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUCKET, situacao, type Conexao, type Publicacao, type RedeId } from "@/lib/publicacoes";
import { idEpisodio, series } from "@/lib/series";
import FormPublicacao from "@/components/admin/FormPublicacao";
import PublicacaoItem from "@/components/admin/PublicacaoItem";
import ConexoesRedes from "@/components/admin/ConexoesRedes";

export const dynamic = "force-dynamic";
// "Publicar agora" espera o Instagram processar o vídeo (até cerca de 50 s)
export const maxDuration = 60;

type Aba = "fila" | "nova" | "concluidas";
const SEM_SERIE = "sem-serie";

/** Agrupa por série (na ordem das séries do site), e dentro de cada uma por episódio ou data. */
function agruparPorSerie(pubs: Publicacao[]) {
  const mapa = new Map<string, Publicacao[]>();
  for (const p of pubs) {
    const slug = p.episodio?.split(":")[0];
    const chave = slug && series.some((s) => s.slug === slug) ? slug : SEM_SERIE;
    mapa.set(chave, [...(mapa.get(chave) ?? []), p]);
  }
  const numero = (p: Publicacao) => Number(p.episodio?.split(":")[1] ?? 0);
  const data = (p: Publicacao) => (p.agendada_em ? Date.parse(p.agendada_em) : Number.MAX_SAFE_INTEGER);
  const ordem = [...series.map((s) => s.slug), SEM_SERIE];
  return ordem
    .filter((chave) => mapa.has(chave))
    .map((chave) => ({
      chave,
      titulo: series.find((s) => s.slug === chave)?.titulo ?? "Sem série",
      itens: mapa.get(chave)!.sort((a, b) => (chave === SEM_SERIE ? data(a) - data(b) : numero(a) - numero(b))),
    }));
}

export default async function PublicacoesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");

  const sp = await searchParams;
  const aba: Aba = sp.aba === "nova" || sp.aba === "concluidas" ? sp.aba : "fila";

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
  const fila = todas.filter((p) => situacao(p) !== "concluida");
  const concluidas = todas.filter((p) => situacao(p) === "concluida");
  const atencao = fila.filter((p) => situacao(p) === "atencao").length;
  const agendadas = fila.filter((p) => situacao(p) === "agendada").length;
  const semData = fila.filter((p) => situacao(p) === "sem-data").length;

  // Miniaturas das capas (links temporários de 1 hora; o bucket é privado).
  const miniaturas: Record<string, string> = {};
  const capas = (aba === "nova" ? [] : aba === "fila" ? fila : concluidas)
    .map((p) => p.capa_path)
    .filter((c): c is string => !!c);
  if (db && capas.length > 0) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(capas, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) miniaturas[u.path] = u.signedUrl;
  }

  const chip = (nome: string, ok: boolean) => (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {nome}: {ok ? "conectado" : "não conectado"}
    </span>
  );

  const abas: { id: Aba; rotulo: string; n?: number; alerta?: boolean }[] = [
    { id: "nova", rotulo: "Nova publicação" },
    { id: "fila", rotulo: "Fila", n: fila.length, alerta: atencao > 0 },
    { id: "concluidas", rotulo: "Concluídas", n: concluidas.length },
  ];

  const lista = (itens: Publicacao[], vazio: string) => {
    if (itens.length === 0) return <div className="card p-8 text-center text-slate-500">{vazio}</div>;
    return agruparPorSerie(itens).map((g) => (
      <section key={g.chave} className="mb-8">
        <h2 className="mb-3 flex items-baseline gap-3 text-lg font-bold text-fg">
          {g.titulo}
          <span className="text-sm font-normal text-slate-500">
            {g.itens.length} {g.itens.length === 1 ? "item" : "itens"}
          </span>
        </h2>
        <ul className="space-y-4">
          {g.itens.map((p) => (
            <PublicacaoItem
              key={p.id}
              p={p}
              conectadas={conectadas}
              miniatura={p.capa_path ? miniaturas[p.capa_path] : undefined}
            />
          ))}
        </ul>
      </section>
    ));
  };

  return (
    <section className="bg-page-2 px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="eyebrow">Painel</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Publicações</h1>
          <p className="mt-1 text-sm text-muted">
            Um vídeo, todas as redes. Horários em Brasília. Episódios ligados a uma série aparecem no site sozinhos.
          </p>
        </div>

        {error ? (
          <p className="mb-10 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
            A tabela de publicações ainda não existe. Rode os arquivos em <code>supabase/migrations/</code> no SQL
            Editor do Supabase.
          </p>
        ) : (
          <>
            <details open={faltaConectar} className="card group mb-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="font-semibold text-fg">Conexões</span>
                {chip("Instagram", conectadas.includes("instagram"))}
                {chip("YouTube", conectadas.includes("youtube"))}
                <span aria-hidden className="ml-auto text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <ConexoesRedes conexoes={conexoes} />
            </details>

            <nav aria-label="Publicações" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
              {abas.map((a) => {
                const atual = a.id === aba;
                return (
                  <Link
                    key={a.id}
                    href={`/admin/publicacoes?aba=${a.id}`}
                    aria-current={atual ? "page" : undefined}
                    className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                      atual
                        ? "border-accent-strong text-accent-strong"
                        : "border-transparent text-muted hover:text-fg"
                    }`}
                  >
                    {a.rotulo}
                    {a.n !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                          a.alerta ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {a.n}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {aba === "nova" && (
              <div className="card">
                <FormPublicacao episodios={episodios} />
              </div>
            )}

            {aba === "fila" && (
              <>
                {fila.length > 0 && (
                  <p className="mb-5 text-sm text-muted">
                    {atencao > 0 && <strong className="text-amber-700">{atencao} precisam de atenção · </strong>}
                    {agendadas} agendadas · {semData} sem data. Agendadas saem sozinhas (Instagram e YouTube); sem
                    data só saem em <strong>Publicar agora</strong>.
                  </p>
                )}
                {lista(fila, "Nada na fila. Crie uma publicação na aba Nova publicação.")}
              </>
            )}

            {aba === "concluidas" && lista([...concluidas].reverse(), "Nenhuma publicação concluída ainda.")}
          </>
        )}
      </div>
    </section>
  );
}
