import Link from "next/link";
import { redirect } from "next/navigation";
import { contarGrupos, lerFiltros, type Pedido, type StatusPedido } from "@/lib/etm";
import { carregarResumos, getEtmUser } from "@/lib/etm-servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FeedFiltravel from "@/components/etm/FeedFiltravel";
import HeroEtm from "@/components/etm/HeroEtm";

export const dynamic = "force-dynamic";

/** Para a ETM, o que espera ação é a versão aguardando avaliação. */
const ACAO: StatusPedido[] = ["em_avaliacao"];

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
  const contagens = contarGrupos(pedidos, ACAO);
  // os resumos de todos os cartões vêm junto: o filtro roda no navegador e não volta ao servidor
  const resumos = db ? Object.fromEntries(await carregarResumos(db, pedidos.map((p) => p.id))) : {};

  return (
    <div className="bg-page-2 pb-24">
      <HeroEtm
        eyebrow={`Olá, ${user.nome.split(" ")[0]}`}
        titulo="Pedidos de vídeo"
        subtitulo="Peça um vídeo, acompanhe a produção e avalie cada versão em um só lugar."
        acao={<Link href="/etm/novo" className="btn-primary">+ Novo pedido</Link>}
      />

      <div className="relative z-10 mx-auto -mt-14 max-w-4xl space-y-6 px-6">
        {contagens.acao > 0 && (
          <div className="card flex items-center gap-3 border-amber-300 bg-amber-50 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
              {contagens.acao}
            </span>
            <p className="text-sm font-medium text-amber-900">
              {contagens.acao === 1
                ? "Há 1 vídeo pronto esperando a sua avaliação."
                : `Há ${contagens.acao} vídeos prontos esperando a sua avaliação.`}
            </p>
          </div>
        )}

        <FeedFiltravel
          pedidos={pedidos}
          resumos={resumos}
          base="/etm"
          precisaAcao={ACAO}
          rotuloAcao="Aguardando avaliação"
          inicial={filtros}
          vazioSemFiltro="Nenhum pedido ainda. Clique em Novo pedido para começar."
        />
      </div>
    </div>
  );
}
