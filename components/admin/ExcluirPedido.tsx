"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { excluirPedido } from "@/app/(site)/admin/etm/actions";

export default function ExcluirPedido({ id }: { id: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function excluir() {
    if (!window.confirm("Excluir este pedido e todos os arquivos dele? Não dá para desfazer.")) return;
    setOcupado(true);
    const r = await excluirPedido(id);
    if (r.ok) router.push("/admin/etm");
    else {
      setOcupado(false);
      window.alert(r.erro);
    }
  }

  return (
    <button disabled={ocupado} onClick={excluir} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
      {ocupado ? "Excluindo..." : "Excluir pedido"}
    </button>
  );
}
