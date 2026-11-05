"use client";

import { useActionState } from "react";
import BrilhosEtm from "@/components/etm/BrilhosEtm";
import { entrar } from "../actions";

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState(entrar, {});

  return (
    <section className="relative isolate flex min-h-[85vh] items-center justify-center overflow-hidden fundo-etm px-6 py-16">
      <BrilhosEtm />

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="mb-3 inline-block text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">Área restrita</p>
          <h1 className="text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_16px_rgba(4,10,50,0.6)]">Painel</h1>
          <p className="mt-2 text-sm text-white">Publicações, séries, mensagens e pedidos da ETM em um só lugar.</p>
        </div>

        <form action={acao} className="card space-y-4 p-7 shadow-2xl shadow-black/40">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-fg">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="username" className="field" />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold text-fg">Senha</label>
            <input id="senha" name="senha" type="password" required autoComplete="current-password" className="field" />
          </div>
          {estado.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
          <button disabled={pendente} className="btn-dark w-full">
            {pendente ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </section>
  );
}
