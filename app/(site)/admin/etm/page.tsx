import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { contarGrupos, lerFiltros, rotuloTipo, type Pedido, type StatusPedido, type UsuarioEtm } from "@/lib/etm";
import { carregarResumos } from "@/lib/etm-servidor";
import FeedFiltravel from "@/components/etm/FeedFiltravel";
import UsuariosEtm from "@/components/admin/UsuariosEtm";
import TiposEtm, { type TipoEtm } from "@/components/admin/TiposEtm";
import ConexaoDrive from "@/components/admin/ConexaoDrive";

export const dynamic = "force-dynamic";

/** O que está esperando uma ação sua. */
const MINHA_VEZ: StatusPedido[] = ["recebido", "correcao", "aprovado"];

export default async function AdminEtmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const filtrosBrutos = await searchParams;
  const filtros = lerFiltros(filtrosBrutos);
  const db = supabaseAdmin();
  if (!db) return <p className="px-6 pt-20 text-muted">Configure as variáveis do Supabase para ver o painel.</p>;

  const [{ data: ped }, { data: usu }, { data: tip }, { data: drive }] = await Promise.all([
    db.from("etm_pedidos").select("*").order("criado_em", { ascending: false }).limit(300),
    db.from("etm_usuarios").select("*").order("criado_em", { ascending: true }),
    db.from("etm_tipos").select("rotulo,ativo,descricao").order("criado_em").order("rotulo"),
    db.from("redes_conexoes").select("conta_nome").eq("rede", "drive").maybeSingle(),
  ]);
  const pedidos = (ped ?? []) as Pedido[];
  const tipos: TipoEtm[] = (tip ?? []).map((t) => ({
    rotulo: t.rotulo as string,
    ativo: t.ativo as boolean,
    descricao: (t.descricao as string) ?? "",
    pedidos: pedidos.filter((p) => rotuloTipo(p.tipo) === t.rotulo).length,
  }));
  const contagens = contarGrupos(pedidos, MINHA_VEZ);
  // os resumos de todos os cartões vêm junto: o filtro roda no navegador e não volta ao servidor
  const resumos = Object.fromEntries(await carregarResumos(db, pedidos.map((p) => p.id)));

  return (
    <section className="bg-page-2 px-6 pb-24 pt-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="eyebrow">Painel</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Pedidos da ETM</h1>
          <p className="mt-1 text-sm text-muted">
            {contagens.acao > 0 ? `${contagens.acao} esperando uma ação sua` : "Nada esperando você"} · <Link href="/etm" className="font-semibold text-accent-strong hover:underline">Abrir a área da ETM</Link>
          </p>
        </div>

        <ConexaoDrive conectado={!!drive} conta={(drive?.conta_nome as string | null) ?? null} resultado={typeof filtrosBrutos.drive === "string" ? filtrosBrutos.drive : undefined} />

        <UsuariosEtm usuarios={(usu ?? []) as UsuarioEtm[]} />

        <TiposEtm tipos={tipos} />

        <FeedFiltravel
          pedidos={pedidos}
          resumos={resumos}
          base="/admin/etm"
          precisaAcao={MINHA_VEZ}
          rotuloAcao="Precisam de ação"
          inicial={filtros}
          vazioSemFiltro="Nenhum pedido ainda. Quando a ETM pedir um vídeo, ele aparece aqui."
        />
      </div>
    </section>
  );
}
