import Link from "next/link";
import { redirect } from "next/navigation";
import { LIMITE_ARQUIVO_ETM, TIPOS_PADRAO } from "@/lib/etm";
import { getEtmUser, limiteDeEnvio, tiposAtivos } from "@/lib/etm-servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FormPedido from "@/components/etm/FormPedido";
import HeroEtm from "@/components/etm/HeroEtm";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  if (!(await getEtmUser())) redirect("/etm/login");
  const db = supabaseAdmin();
  const [tipos, limite] = db
    ? await Promise.all([tiposAtivos(db), limiteDeEnvio(db)])
    : [TIPOS_PADRAO, LIMITE_ARQUIVO_ETM];
  return (
    <div className="bg-page-2 pb-24">
      <HeroEtm
        eyebrow="Novo pedido"
        titulo="O que vamos produzir?"
        subtitulo="Quanto mais detalhe e material você enviar, menos idas e vindas até a aprovação."
      />
      <div className="relative z-10 mx-auto -mt-14 max-w-2xl px-6">
        <Link href="/etm" className="mb-3 inline-block text-sm font-medium text-blue-100 hover:text-white">← Voltar aos pedidos</Link>
        <FormPedido tipos={tipos} limite={limite} />
      </div>
    </div>
  );
}
