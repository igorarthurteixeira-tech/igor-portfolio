import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { carregarDetalhe, getEtmUser, limiteDeEnvio } from "@/lib/etm-servidor";
import { perguntasAbertas } from "@/lib/etm";
import CabecalhoPedido from "@/components/etm/CabecalhoPedido";
import DetalhePedido from "@/components/etm/DetalhePedido";
import PerguntasAbertas from "@/components/etm/PerguntasAbertas";
import AcoesPedido from "@/components/etm/AcoesPedido";
import HeroEtm from "@/components/etm/HeroEtm";

export const dynamic = "force-dynamic";

export default async function PedidoEtmPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getEtmUser();
  if (!user) redirect("/etm/login");
  const { id } = await params;
  const db = supabaseAdmin();
  const [detalhe, limite] = db ? await Promise.all([carregarDetalhe(db, id), limiteDeEnvio(db)]) : [null, 0];
  if (!detalhe) notFound();

  const abertas = perguntasAbertas(detalhe.eventos);
  const encerrado = detalhe.pedido.status === "enviado" || detalhe.pedido.status === "cancelado";

  return (
    <div className="bg-page-2 pb-24">
      <HeroEtm eyebrow={`Pedido #${detalhe.pedido.numero}`} titulo={detalhe.pedido.titulo} />
      <div className="relative z-10 mx-auto -mt-14 max-w-4xl space-y-6 px-6">
        <Link href="/etm" className="inline-block text-sm font-medium text-blue-100 hover:text-white">← Voltar aos pedidos</Link>
        <CabecalhoPedido pedido={detalhe.pedido} topo="top-18" bloqueado={abertas.length > 0} />
        {abertas.length > 0 && (
          <PerguntasAbertas
            pedidoId={id}
            limite={limite}
            perguntas={abertas.map((e) => ({ id: e.id, autor: e.autor_nome, texto: e.texto, quando: e.criado_em }))}
          />
        )}
        {!encerrado && <AcoesPedido pedidoId={id} status={detalhe.pedido.status} modo="etm" limite={limite} usuarioId={user.id} />}
        <DetalhePedido {...detalhe} comTitulo={false} quem={{ id: user.id, admin: user.admin }} />
      </div>
    </div>
  );
}
