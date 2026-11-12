"use client";

import { useState } from "react";
import type { Produto } from "@/lib/escritorio/fonte";
import { Painel } from "./Paineis";
import { MAX_PESQUISADORES } from "./planta";

export type Contrato = { id: string; funcionario_id: string; produto_id: string; inicio: string; fim: string };
type Pesquisador = { id: string; nome: string };

const DURACOES = [
  { dias: 1, rotulo: "1 dia" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias", pago: true },
];

export function restante(fim: string, agora: number) {
  const ms = new Date(fim).getTime() - agora;
  if (ms <= 0) return "encerrado";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function Andamento({ contrato, catalogo, agora }: { contrato: Contrato; catalogo: Produto[]; agora: number }) {
  const p = catalogo.find((x) => x.id === contrato.produto_id);
  const total = new Date(contrato.fim).getTime() - new Date(contrato.inicio).getTime();
  const feito = Math.min(1, Math.max(0, (agora - new Date(contrato.inicio).getTime()) / total));
  return (
    <div className="mt-2">
      <p className="text-sm text-white">{p?.nome ?? contrato.produto_id}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-amber-300" style={{ width: `${feito * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-300">
        <span>até {new Date(contrato.fim).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
        <span className="font-semibold text-white">faltam {restante(contrato.fim, agora)}</span>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Contratos não podem ser cancelados.</p>
    </div>
  );
}

function NovoContrato({
  catalogo,
  escolhido: novo,
  ocupados,
  plano,
  ocupado,
  nome,
  aoAssinar,
}: {
  catalogo: Produto[];
  escolhido: Produto | null;
  ocupados: Set<string>;
  plano: "gratis" | "pago";
  ocupado: boolean;
  nome: string;
  aoAssinar: (produtoId: string, dias: number) => Promise<void>;
}) {
  // o produto escolhido na busca vem primeiro (e já marcado); depois, os que o escritório já acompanhou
  const opcoes = novo ? [novo, ...catalogo.filter((p) => p.id !== novo.id)] : catalogo;
  const [produto, setProduto] = useState(novo && !ocupados.has(novo.id) ? novo.id : "");
  const [dias, setDias] = useState(7);
  const [confirmando, setConfirmando] = useState(false);
  const escolhido = opcoes.find((p) => p.id === produto);

  return (
    <div className="mt-2">
      <p className="mb-2 text-[11px] text-slate-300">
        {opcoes.length ? `Produto que ${nome} vai acompanhar:` : "Pesquise um produto e clique em Escolher."}
      </p>
      <div className="grid max-h-56 gap-1 overflow-y-auto">
        {opcoes.map((p) => {
          const comOutro = ocupados.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={comOutro}
              onClick={() => {
                setProduto(p.id);
                setConfirmando(false);
              }}
              aria-pressed={produto === p.id}
              className={`rounded-lg px-2 py-1.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                produto === p.id ? "bg-white/15 ring-1 ring-accent-light" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="block text-white">{p.nome}</span>
              <span className="block text-[11px] text-slate-400">
                {comOutro ? "já está com outro pesquisador" : `${p.marca} · ${p.modelo}`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Por quanto tempo</p>
      <div className="flex gap-1.5">
        {DURACOES.map((d) => {
          const bloqueado = d.pago && plano === "gratis";
          return (
            <button
              key={d.dias}
              type="button"
              disabled={bloqueado}
              onClick={() => {
                setDias(d.dias);
                setConfirmando(false);
              }}
              aria-pressed={dias === d.dias}
              title={bloqueado ? "Disponível no plano pago" : undefined}
              className={`flex-1 rounded-lg px-2 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                dias === d.dias ? "bg-white/15 text-white ring-1 ring-accent-light" : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {d.rotulo}
              {bloqueado && <span className="block text-[10px] text-slate-400">plano pago</span>}
            </button>
          );
        })}
      </div>

      {!confirmando ? (
        <button type="button" disabled={!escolhido || ocupado} onClick={() => setConfirmando(true)} className="btn-primary mt-3 w-full py-2.5!">
          Assinar contrato
        </button>
      ) : (
        <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100">
          <p>
            {nome} vai acompanhar <strong>{escolhido?.nome}</strong> por <strong>{dias} dia{dias > 1 ? "s" : ""}</strong>. Depois de assinado, o
            contrato <strong>não pode ser cancelado</strong>.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={async () => {
                await aoAssinar(produto, dias);
                setConfirmando(false);
                setProduto("");
              }}
              className="btn-primary flex-1 py-2!"
            >
              {ocupado ? "Assinando..." : "Confirmar"}
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="btn-ghost flex-1 py-2!">
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Equipe de pesquisa: cada pesquisador com o seu contrato (1 produto) e o botão de contratar mais. */
export function EquipePesquisa({
  catalogo,
  escolhido,
  pesquisadores,
  contratos,
  plano,
  agora,
  ocupado,
  aoAssinar,
  aoContratar,
}: {
  catalogo: Produto[];
  escolhido?: Produto | null;
  pesquisadores: Pesquisador[];
  contratos: Contrato[];
  plano: "gratis" | "pago";
  agora: number;
  ocupado: boolean;
  aoAssinar: (funcionarioId: string, produtoId: string, dias: number) => Promise<void>;
  aoContratar: () => Promise<void>;
}) {
  const ativos = contratos.filter((c) => new Date(c.fim).getTime() > agora);
  const ativoDe = (id: string) => ativos.find((c) => c.funcionario_id === id) ?? null;
  const livre = pesquisadores.find((p) => !ativoDe(p.id));
  const [aberto, setAberto] = useState<string | null>(null);
  const atual = aberto ?? livre?.id ?? pesquisadores[0]?.id ?? null;
  const ocupados = new Set(ativos.map((c) => c.produto_id));

  return (
    <Painel
      titulo="Equipe de pesquisa"
      extra={
        <span className="text-[11px] text-slate-400">
          {pesquisadores.length} de {plano === "pago" ? MAX_PESQUISADORES : 1}
        </span>
      }
    >
      <ul className="space-y-1.5">
        {pesquisadores.map((p) => {
          const c = ativoDe(p.id);
          const expandido = atual === p.id;
          const prod = c ? catalogo.find((x) => x.id === c.produto_id) : null;
          return (
            <li key={p.id} className={`rounded-lg px-2 py-1.5 transition ${expandido ? "bg-white/8 ring-1 ring-white/15" : "bg-white/4"}`}>
              <button type="button" onClick={() => setAberto(expandido ? "" : p.id)} aria-expanded={expandido} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="text-sm font-semibold text-white">{p.nome}</span>
                {c ? (
                  <span className="rounded-full bg-amber-300 px-2 text-[10px] font-semibold text-amber-950">
                    {prod?.modelo} · {restante(c.fim, agora)}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-400/20 px-2 text-[10px] font-semibold text-emerald-300">livre</span>
                )}
              </button>
              {expandido &&
                (c ? (
                  <Andamento contrato={c} catalogo={catalogo} agora={agora} />
                ) : (
                  <NovoContrato
                    key={`${p.id}|${escolhido?.id ?? ""}`}
                    catalogo={catalogo}
                    escolhido={escolhido ?? null}
                    ocupados={ocupados}
                    plano={plano}
                    ocupado={ocupado}
                    nome={p.nome}
                    aoAssinar={(produto, dias) => aoAssinar(p.id, produto, dias)}
                  />
                ))}
            </li>
          );
        })}
      </ul>

      {plano === "pago" ? (
        <button
          type="button"
          disabled={ocupado || pesquisadores.length >= MAX_PESQUISADORES}
          onClick={aoContratar}
          className="btn-ghost mt-3 w-full py-2!"
        >
          + Contratar pesquisador
        </button>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-white/20 p-3 text-[11px] text-slate-300">
          <strong className="text-white">Quer acompanhar mais produtos ao mesmo tempo?</strong> Cada pesquisador cuida de 1 produto. No plano
          pago você contrata mais pesquisadores e personaliza o escritório.
        </div>
      )}
    </Painel>
  );
}
