"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UsuarioEtm } from "@/lib/etm";
import {
  definirSituacaoEtm,
  recusarUsuarioEtm,
  redefinirSenhaEtm,
} from "@/app/(site)/admin/etm/actions";

export default function UsuariosEtm({ usuarios }: { usuarios: UsuarioEtm[] }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function rodar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>, ok: string) {
    setErro("");
    setAviso("");
    setOcupado(true);
    const r = await acao();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setAviso(ok);
    router.refresh();
  }

  function trocarSenha(u: UsuarioEtm) {
    const senha = window.prompt(`Nova senha para ${u.nome} (mínimo 8 caracteres):`);
    if (senha) rodar(() => redefinirSenhaEtm(u.user_id, senha), "Senha trocada.");
  }

  function recusar(u: UsuarioEtm) {
    if (window.confirm(`Recusar o cadastro de ${u.nome}? A conta será apagada.`)) {
      rodar(() => recusarUsuarioEtm(u.user_id), "Cadastro recusado.");
    }
  }

  const pendentes = usuarios.filter((u) => u.situacao === "pendente");
  const demais = usuarios.filter((u) => u.situacao !== "pendente");

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-fg">Pessoas da ETM</h2>
      <p className="mt-1 text-sm text-muted">
        Cada pessoa se cadastra em <span className="font-semibold">/etm/cadastro</span> e só entra depois que você aprovar aqui.
      </p>

      {pendentes.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-900">Aguardando sua aprovação ({pendentes.length})</p>
          <ul className="divide-y divide-amber-200">
            {pendentes.map((u) => (
              <li key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{u.nome}</p>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                </div>
                <div className="flex gap-3 text-xs font-semibold">
                  <button
                    disabled={ocupado}
                    onClick={() => rodar(() => definirSituacaoEtm(u.user_id, "aprovado"), `${u.nome} aprovado(a).`)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button disabled={ocupado} onClick={() => recusar(u)} className="px-2 py-1.5 text-red-600 hover:underline">
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {demais.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {demais.map((u) => {
            const liberado = u.situacao === "aprovado";
            return (
              <li key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className={`font-medium ${liberado ? "text-fg" : "text-slate-400 line-through"}`}>{u.nome}</p>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                </div>
                <div className="flex gap-3 text-xs font-semibold">
                  <button disabled={ocupado} onClick={() => trocarSenha(u)} className="text-accent-strong hover:underline">
                    Trocar senha
                  </button>
                  <button
                    disabled={ocupado}
                    onClick={() =>
                      rodar(
                        () => definirSituacaoEtm(u.user_id, liberado ? "bloqueado" : "aprovado"),
                        liberado ? "Acesso bloqueado." : "Acesso liberado.",
                      )
                    }
                    className={liberado ? "text-red-600 hover:underline" : "text-emerald-700 hover:underline"}
                  >
                    {liberado ? "Bloquear" : "Liberar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {usuarios.length === 0 && <p className="mt-4 text-sm text-slate-500">Ninguém se cadastrou ainda.</p>}
      {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {aviso && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
    </div>
  );
}
