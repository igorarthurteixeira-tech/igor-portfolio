"use client";

import { useActionState } from "react";
import { entrar } from "../actions";

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState(entrar, {});

  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-page-2 px-6">
      <form
        action={acao}
        className="card w-full max-w-sm space-y-4 p-8 shadow-xl shadow-slate-900/10"
      >
        <div className="mb-2">
          <p className="eyebrow">Área restrita</p>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Painel</h1>
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          aria-label="E-mail"
          autoComplete="username"
          className="field"
        />
        <input
          name="senha"
          type="password"
          required
          placeholder="Senha"
          aria-label="Senha"
          autoComplete="current-password"
          className="field"
        />
        {estado.erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {estado.erro}
          </p>
        )}
        <button disabled={pendente} className="btn-dark w-full">
          {pendente ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </section>
  );
}
