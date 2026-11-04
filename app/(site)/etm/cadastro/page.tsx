"use client";

import Link from "next/link";
import { useActionState } from "react";
import BrilhosEtm from "@/components/etm/BrilhosEtm";
import PainelApresentacao from "@/components/etm/PainelApresentacao";
import { cadastrarEtm } from "../actions";

export default function EtmCadastroPage() {
  const [estado, acao, pendente] = useActionState(cadastrarEtm, {});

  return (
    <section className="relative isolate flex min-h-[85vh] items-center overflow-hidden fundo-etm px-6 py-16">
      <BrilhosEtm />

      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <PainelApresentacao />

        <div className="mx-auto w-full max-w-sm">
          {estado.ok ? (
            <div className="card space-y-3 p-8 text-center shadow-2xl shadow-black/40">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-fg">Cadastro enviado</h2>
              <p className="text-sm leading-relaxed text-muted">
                Seu acesso será liberado assim que o cadastro for aprovado. Depois disso, entre com o e-mail e a senha que você escolheu.
              </p>
              <Link href="/etm/login" className="btn-outline mt-2 w-full">Ir para o login</Link>
            </div>
          ) : (
            <>
              <form action={acao} className="card space-y-4 p-7 shadow-2xl shadow-black/40">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-fg">Criar cadastro</h2>
                  <p className="mt-1 text-sm text-muted">Depois de enviar, seu acesso fica aguardando aprovação.</p>
                </div>
                <div>
                  <label htmlFor="nome" className="mb-1.5 block text-sm font-semibold text-fg">Nome completo</label>
                  <input id="nome" name="nome" required minLength={2} maxLength={80} autoComplete="name" className="field" />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-fg">E-mail</label>
                  <input id="email" name="email" type="email" required autoComplete="username" className="field" />
                </div>
                <div>
                  <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold text-fg">Senha</label>
                  <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className="field" />
                  <p className="mt-1.5 text-xs text-muted">Mínimo de 8 caracteres.</p>
                </div>
                {estado.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
                <button disabled={pendente} className="btn-dark w-full">
                  {pendente ? "Enviando..." : "Enviar cadastro"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-blue-100">
                Já tem cadastro? <Link href="/etm/login" className="font-semibold text-white underline-offset-4 hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
