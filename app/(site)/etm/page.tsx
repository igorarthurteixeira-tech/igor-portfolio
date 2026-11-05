import Link from "next/link";
import { redirect } from "next/navigation";
import { lerFiltros, type Pedido, type StatusPedido } from "@/lib/etm";
import { carregarResumos, getEtmUser } from "@/lib/etm-servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FeedFiltravel from "@/components/etm/FeedFiltravel";
import HeroEtm from "@/components/etm/HeroEtm";

export const dynamic = "force-dynamic";

/** Para a ETM, espera ação a versão aguardando avaliação e a cobrança aguardando aceite. */
const ACAO: StatusPedido[] = ["em_avaliacao", "aguardando_aceite"];

export default async function EtmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getEtmUser();
  if (!user) redirect("/etm/login");

  const filtros = lerFiltros(await searchParams);
  const db = supabaseAdmin();
  const { data } = db
    ? await db.from("etm_pedidos").select("*").order("criado_em", { ascending: false }).limit(200)
    : { data: [] };
  const pedidos = (data ?? []) as Pedido[];
  const aceites = pedidos.filter((p) => p.status === "aguardando_aceite").length;
  const avaliacoes = pedidos.filter((p) => p.status === "em_avaliacao").length;
  // os resumos de todos os cartões vêm junto: o filtro roda no navegador e não volta ao servidor
  const resumos = db ? Object.fromEntries(await carregarResumos(db, pedidos.map((p) => p.id))) : {};
  const comPergunta = Object.values(resumos).filter((r) => r.perguntasAbertas > 0).length;

  return (
    <div className="bg-page-2 pb-24">
      <HeroEtm
        eyebrow={`Olá, ${user.nome.split(" ")[0]}`}
        titulo="Pedidos de vídeo"
        subtitulo="Peça um vídeo, acompanhe a produção e avalie cada versão em um só lugar."
        acao={<Link href="/etm/novo" className="btn-primary">+ Novo pedido</Link>}
      />

      <div className="relative z-10 mx-auto -mt-14 max-w-4xl space-y-6 px-6">
        {comPergunta > 0 && (
          <div className="card flex items-center gap-3 border-2 border-amber-400 bg-amber-50 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
              {comPergunta}
            </span>
            <p className="text-sm font-semibold text-amber-900">
              {comPergunta === 1
                ? "1 pedido tem uma pergunta esperando a sua resposta."
                : `${comPergunta} pedidos têm perguntas esperando a sua resposta.`}
            </p>
          </div>
        )}

        {aceites > 0 && (
          <div className="card flex items-center gap-3 border-2 border-sky-400 bg-sky-50 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">{aceites}</span>
            <p className="text-sm font-semibold text-sky-900">
              {aceites === 1
                ? "1 pedido tem uma cobrança esperando o seu aceite para a produção começar."
                : `${aceites} pedidos têm cobrança esperando o seu aceite para a produção começar.`}
            </p>
          </div>
        )}

        {avaliacoes > 0 && (
          <div className="card flex items-center gap-3 border-amber-300 bg-amber-50 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
              {avaliacoes}
            </span>
            <p className="text-sm font-medium text-amber-900">
              {avaliacoes === 1
                ? "Há 1 vídeo pronto esperando a sua avaliação."
                : `Há ${avaliacoes} vídeos prontos esperando a sua avaliação.`}
            </p>
          </div>
        )}

        <FeedFiltravel
          destacarPerguntas
          pedidos={pedidos}
          resumos={resumos}
          base="/etm"
          precisaAcao={ACAO}
          rotuloAcao="Precisam de você"
          inicial={filtros}
          vazioSemFiltro="Nenhum pedido ainda. Clique em Novo pedido para começar."
        />
      </div>
    </div>
  );
}
