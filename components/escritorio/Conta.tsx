"use client";

import { useState } from "react";
import { clienteEscritorio } from "@/lib/escritorio/cliente";

/** Janela de entrar / criar conta. Ao criar a conta, o escritório grátis é montado no banco. */
export default function Conta({
  aoFechar,
  modoInicial = "criar",
}: {
  /** `true` quando entrou ou criou a conta com sucesso */
  aoFechar: (ok: boolean) => void;
  modoInicial?: "criar" | "entrar";
}) {
  const [modo, setModo] = useState<"criar" | "entrar">(modoInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const sb = clienteEscritorio();
    if (!sb) return setErro("Login indisponível no momento.");
    setErro("");
    setEnviando(true);
    const { error } =
      modo === "criar" ? await sb.auth.signUp({ email, password: senha }) : await sb.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      const msg = error.message.toLowerCase();
      setErro(
        msg.includes("already registered")
          ? "Este e-mail já tem conta. Use \"Entrar\"."
          : msg.includes("invalid login")
            ? "E-mail ou senha incorretos."
            : msg.includes("password")
              ? "A senha precisa ter pelo menos 6 caracteres."
              : "Não deu certo. Confira os dados e tente de novo.",
      );
      return;
    }
    aoFechar(true);
  }

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="conta-titulo">
      <form onSubmit={enviar} className="w-full max-w-sm rounded-2xl bg-white p-6 text-fg shadow-2xl">
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-page-2 p-1 text-sm font-semibold" role="tablist">
          {(["criar", "entrar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => {
                setModo(m);
                setErro("");
              }}
              className={`rounded-lg py-2 transition ${modo === m ? "bg-white text-fg shadow" : "text-muted hover:text-fg"}`}
            >
              {m === "criar" ? "Criar conta" : "Já tenho conta"}
            </button>
          ))}
        </div>
        <h2 id="conta-titulo" className="text-xl font-bold">
          {modo === "criar" ? "Criar meu escritório grátis" : "Entrar no meu escritório"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {modo === "criar"
            ? "Você recebe um escritório com pesquisador, analista e comprador. O pesquisador monitora 1 produto por até 7 dias."
            : "Use o e-mail e a senha do cadastro."}
        </p>
        <label className="mt-4 block text-sm font-medium">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Senha
          <input
            type="password"
            required
            minLength={6}
            autoComplete={modo === "criar" ? "new-password" : "current-password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={enviando} className="btn-dark mt-5 w-full">
          {enviando ? "Aguarde..." : modo === "criar" ? "Criar conta" : "Entrar"}
        </button>
        <div className="mt-3 text-right text-sm">
          <button type="button" className="text-muted hover:underline" onClick={() => aoFechar(false)}>
            Fechar
          </button>
        </div>
      </form>
    </div>
  );
}
