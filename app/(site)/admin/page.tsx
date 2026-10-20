import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MensagemItem, { type Mensagem } from "@/components/admin/MensagemItem";
import { sair } from "./actions";

export const dynamic = "force-dynamic";

type Evento = {
  tipo: "view" | "click";
  caminho: string;
  alvo: string | null;
  sessao: string | null;
  referrer: string | null;
  created_at: string;
};

const PERIODOS = [7, 30, 90] as const;
const LIMITE_EVENTOS = 20000;

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86400000);
}

function top(itens: (string | null)[], limite = 6) {
  const mapa = new Map<string, number>();
  for (const i of itens) {
    if (i) mapa.set(i, (mapa.get(i) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite);
}

function host(ref: string | null) {
  if (!ref) return "Direto";
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return "Direto";
  }
}

const icones = {
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  users:
    "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  click: "M5 3l14 7-6 2-2 6L5 3z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
} as const;

function Icone({ nome }: { nome: keyof typeof icones }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={icones[nome]} />
    </svg>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; f?: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const sp = await searchParams;
  const dias = PERIODOS.find((p) => String(p) === sp.d) ?? 30;
  const soNaoLidas = sp.f === "nao-lidas";

  const db = supabaseAdmin();
  if (!db) {
    return (
      <p className="px-6 pt-20 text-muted">
        Configure as variáveis do Supabase para ver o painel.
      </p>
    );
  }

  const [{ data: ev }, { data: msgs }] = await Promise.all([
    db
      .from("eventos")
      .select("tipo,caminho,alvo,sessao,referrer,created_at")
      .gte("created_at", diasAtras(dias).toISOString())
      .order("created_at", { ascending: false })
      .limit(LIMITE_EVENTOS),
    db
      .from("mensagens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const eventos = (ev ?? []) as Evento[];
  const todas = (msgs ?? []) as Mensagem[];
  const naoLidas = todas.filter((m) => !m.lida).length;
  const mensagens = soNaoLidas ? todas.filter((m) => !m.lida) : todas;
  const truncado = eventos.length >= LIMITE_EVENTOS;
  const views = eventos.filter((e) => e.tipo === "view");
  const cliques = eventos.filter((e) => e.tipo === "click");
  const sessoes = new Set(views.map((v) => v.sessao).filter(Boolean)).size;

  // séries diárias (fuso de Brasília)
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  const dv = new Map<string, number>();
  const dc = new Map<string, number>();
  for (let i = dias - 1; i >= 0; i--) {
    const k = fmt.format(diasAtras(i));
    dv.set(k, 0);
    dc.set(k, 0);
  }
  for (const e of eventos) {
    const k = fmt.format(new Date(e.created_at));
    const alvo = e.tipo === "view" ? dv : dc;
    if (alvo.has(k)) alvo.set(k, alvo.get(k)! + 1);
  }
  const datas = [...dv.keys()];
  const sv = [...dv.values()];
  const sc = [...dc.values()];
  const maximo = Math.max(1, ...sv, ...sc);
  const W = 600;
  const H = 160;
  const x = (i: number) => (datas.length > 1 ? (i / (datas.length - 1)) * W : W / 2);
  const y = (n: number) => H - 8 - (n / maximo) * (H - 20);
  const linha = (s: number[]) =>
    s.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  const area = `${linha(sv)} L${W},${H} L0,${H} Z`;
  const dd = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);

  const cards = [
    { titulo: "Visualizações", valor: views.length, icone: "eye" },
    { titulo: "Visitas (sessões)", valor: sessoes, icone: "users" },
    { titulo: "Cliques", valor: cliques.length, icone: "click" },
    { titulo: "Mensagens novas", valor: naoLidas, icone: "mail" },
  ] as const;

  const listas = [
    ["Páginas mais vistas", top(views.map((v) => v.caminho))],
    ["Cliques por destino", top(cliques.map((c) => c.alvo))],
    ["Origem do tráfego", top(views.map((v) => host(v.referrer)))],
  ] as const;

  const chip = (ativo: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition ${
      ativo
        ? "bg-accent-strong text-white"
        : "text-muted hover:bg-slate-200 hover:text-fg"
    }`;

  return (
    <section className="bg-page-2 px-6 pb-24 pt-10"><div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Painel</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-outline px-4! py-2!">
            Ver site
          </Link>
          <form action={sair}>
            <button className="btn-outline px-4! py-2!">Sair</button>
          </form>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/admin?d=${p}${soNaoLidas ? "&f=nao-lidas" : ""}`}
            className={chip(p === dias)}
          >
            {p} dias
          </Link>
        ))}
      </div>

      {truncado && (
        <p className="mb-4 rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-800">
          Há mais de {LIMITE_EVENTOS.toLocaleString("pt-BR")} eventos neste
          período; os números mostram apenas os mais recentes.
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.titulo} className="card p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-strong/10 text-accent-strong">
              <Icone nome={c.icone} />
            </div>
            <p className="text-3xl font-bold tracking-tight text-fg">
              {c.valor.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 text-sm text-muted">{c.titulo}</p>
          </div>
        ))}
      </div>

      <div className="card mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">Atividade por dia</p>
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-strong" /> Visualizações
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Cliques
            </span>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-0 top-0 text-[10px] text-slate-500">
            {maximo}
          </span>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-44 w-full"
            role="img"
            aria-label="Gráfico de visualizações e cliques por dia"
          >
            <defs>
              <linearGradient id="areaV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a3bd1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0a3bd1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1="0"
                x2={W}
                y1={H * t}
                y2={H * t}
                stroke="rgb(15 23 42 / 0.08)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill="url(#areaV)" />
            <path
              d={linha(sv)}
              fill="none"
              stroke="#0a3bd1"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <path
              d={linha(sc)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {datas.map((d, i) => (
              <rect
                key={d}
                x={x(i) - W / datas.length / 2}
                y="0"
                width={W / datas.length}
                height={H}
                fill="transparent"
              >
                <title>{`${dd(d)}: ${sv[i]} visualizações, ${sc[i]} cliques`}</title>
              </rect>
            ))}
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>{dd(datas[0])}</span>
            <span>{dd(datas[Math.floor(datas.length / 2)])}</span>
            <span>{dd(datas[datas.length - 1])}</span>
          </div>
        </div>
      </div>

      <div className="mb-14 grid gap-4 lg:grid-cols-3">
        {listas.map(([titulo, itens]) => {
          const maior = itens[0]?.[1] ?? 1;
          return (
            <div key={titulo} className="card p-5">
              <p className="mb-4 text-sm font-medium text-fg">{titulo}</p>
              {itens.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {itens.map(([nome, n]) => (
                    <li key={nome}>
                      <div className="mb-1 flex justify-between gap-3">
                        <span className="truncate text-muted">{nome}</span>
                        <span className="text-slate-500">{n}</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-200">
                        <div
                          className="h-1 rounded-full bg-accent-strong"
                          style={{ width: `${(n / maior) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          Mensagens
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/admin?d=${dias}`} className={chip(!soNaoLidas)}>
            Todas ({todas.length})
          </Link>
          <Link
            href={`/admin?d=${dias}&f=nao-lidas`}
            className={chip(soNaoLidas)}
          >
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
    </div></section>
  );
}
