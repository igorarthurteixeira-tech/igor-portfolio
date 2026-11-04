"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adicionarTipoEtm, alternarTipoEtm, editarDescricaoTipoEtm } from "@/app/(site)/admin/etm/actions";

export type TipoEtm = { rotulo: string; ativo: boolean; descricao: string; pedidos: number };

export default function TiposEtm({ tipos }: { tipos: TipoEtm[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function rodar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
    setErro("");
    setOcupado(true);
    const r = await acao();
    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      return false;
    }
    router.refresh();
    return true;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (await rodar(() => adicionarTipoEtm(nome, descricao))) {
      setNome("");
      setDescricao("");
    }
  }

  function editar(t: TipoEtm) {
    const nova = window.prompt(`Para que serve "${t.rotulo}"? (até 200 letras)`, t.descricao);
    if (nova !== null) rodar(() => editarDescricaoTipoEtm(t.rotulo, nova));
  }

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-fg">Tipos de pedido</h2>
      <p className="mt-1 text-sm text-muted">
        A ETM também cria tipos novos direto no pedido. Ocultar tira o tipo da lista do formulário, mas os pedidos antigos mantêm o nome.
      </p>

      <ul className="mt-4 divide-y divide-line">
        {tipos.map((t) => (
          <li key={t.rotulo} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${t.ativo ? "text-fg" : "text-slate-400 line-through"}`}>
                {t.rotulo} <span className="ml-1 text-xs font-normal text-slate-400">{t.pedidos} {t.pedidos === 1 ? "pedido" : "pedidos"}</span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.descricao || "Sem descrição."}</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold">
              <button disabled={ocupado} onClick={() => editar(t)} className="text-accent-strong hover:underline">
                Editar descrição
              </button>
              <button
                disabled={ocupado}
                onClick={() => rodar(() => alternarTipoEtm(t.rotulo, !t.ativo))}
                className={t.ativo ? "text-red-600 hover:underline" : "text-emerald-700 hover:underline"}
              >
                {t.ativo ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={adicionar} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[14rem_1fr_auto]">
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Novo tipo de pedido" aria-label="Nome do novo tipo" className="field" />
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} placeholder="Para que serve" aria-label="Descrição do novo tipo" className="field" />
        <button disabled={ocupado || nome.trim().length < 2} className="btn-outline px-5 py-3">
          Adicionar
        </button>
      </form>
      {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
