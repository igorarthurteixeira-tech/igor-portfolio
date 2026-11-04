"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { desconectarDriveEtm } from "@/app/(site)/admin/etm/actions";

const AVISOS: Record<string, { ok: boolean; texto: string }> = {
  ok: { ok: true, texto: "Google Drive conectado. Os próximos arquivos já vão para ele." },
  negado: { ok: false, texto: "Você não autorizou o acesso no Google." },
  invalido: { ok: false, texto: "A autorização não pôde ser confirmada. Tente de novo." },
  "sem-configuracao": { ok: false, texto: "As chaves do Google ainda não estão configuradas no servidor." },
  erro: { ok: false, texto: "Não foi possível concluir a conexão com o Google Drive." },
};

/** Conexão do Google Drive onde ficam os arquivos dos pedidos (conta Google dedicada a isso). */
export default function ConexaoDrive({
  conectado,
  conta,
  resultado,
}: {
  conectado: boolean;
  conta: string | null;
  resultado?: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const aviso = resultado ? (AVISOS[resultado] ?? AVISOS.erro) : null;

  async function desconectar() {
    if (
      !window.confirm(
        "Desconectar o Google Drive? Os arquivos continuam na conta do Google, mas o site deixa de conseguir abri-los até você reconectar.",
      )
    ) {
      return;
    }
    setOcupado(true);
    await desconectarDriveEtm();
    setOcupado(false);
    router.refresh();
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold tracking-tight text-fg">Armazenamento dos arquivos</h2>
        {conectado ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Google Drive{conta ? ` · ${conta}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Supabase (limite de 50 MB)
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted">
        {conectado
          ? "Os arquivos novos dos pedidos vão para uma pasta de cada pedido na conta do Drive (até 500 MB por arquivo). Os que já estavam no Supabase continuam lá."
          : "Conecte uma conta do Google dedicada a isso para guardar os arquivos no Drive, sem o limite de 50 MB."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href="/api/etm/drive/conectar" className="btn-dark px-5 py-2.5">
          {conectado ? "Reconectar" : "Conectar Google Drive"}
        </a>
        {conectado && (
          <button disabled={ocupado} onClick={desconectar} className="text-sm font-semibold text-red-600 hover:underline">
            Desconectar
          </button>
        )}
      </div>

      {aviso && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} role="status">
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
