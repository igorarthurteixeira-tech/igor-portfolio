"use client";

import Link from "next/link";
import { useActionState } from "react";
import BrilhosEtm from "@/components/etm/BrilhosEtm";
import PainelApresentacao from "@/components/etm/PainelApresentacao";
import { entrarEtm } from "../actions";

export default function EtmLoginPage() {
  const [estado, acao, pendente] = useActionState(entrarEtm, {});

  return (
    <section className="relative isolate flex min-h-[85vh] items-center overflow-hidden fundo-etm px-6 py-16">
      <BrilhosEtm />

      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <PainelApresentacao />

        <div className="mx-auto w-full max-w-sm">
          <form action={acao} className="card space-y-4 p-7 shadow-2xl shadow-black/40">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-fg">Entrar</h2>
              <p className="mt-1 text-sm text-muted">Use o e-mail e a senha do seu cadastro.</p>
            </div>
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

          <p className="mt-5 text-center text-sm text-blue-100">
            Primeiro acesso? <Link href="/etm/cadastro" className="font-semibold text-white underline-offset-4 hover:underline">Criar cadastro</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
