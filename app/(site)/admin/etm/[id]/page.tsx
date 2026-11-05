import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { carregarDetalhe, limiteDeEnvio } from "@/lib/etm-servidor";
import { perguntasAbertas } from "@/lib/etm";
import CabecalhoPedido from "@/components/etm/CabecalhoPedido";
import DetalhePedido from "@/components/etm/DetalhePedido";
import AcoesPedido from "@/components/etm/AcoesPedido";
import ExcluirPedido from "@/components/admin/ExcluirPedido";

export const dynamic = "force-dynamic";

export default async function AdminPedidoEtmPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const { id } = await params;
  const db = supabaseAdmin();
  const [detalhe, limite] = db ? await Promise.all([carregarDetalhe(db, id), limiteDeEnvio(db)]) : [null, 0];
  if (!detalhe) notFound();

  return (
    <section className="bg-page-2 px-6 pb-24 pt-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/etm" className="text-sm font-medium text-muted hover:text-fg">← Voltar aos pedidos</Link>
          <ExcluirPedido id={id} />
        </div>
        <CabecalhoPedido pedido={detalhe.pedido} topo="top-32" bloqueado={perguntasAbertas(detalhe.eventos).length > 0} />
        <AcoesPedido pedidoId={id} status={detalhe.pedido.status} modo="igor" limite={limite} usuarioId={user.id} />
        <DetalhePedido {...detalhe} quem={{ id: user.id, admin: true }} />
      </div>
    </section>
  );
}
