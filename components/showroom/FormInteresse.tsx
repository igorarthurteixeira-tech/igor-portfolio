"use client";

import { useState } from "react";
import { registrarInteresse } from "@/lib/showroom-store";

export default function FormInteresse({ carroId, nomeCarro }: { carroId: string; nomeCarro: string }) {
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    registrarInteresse({
      carroId,
      nome: d.nome.trim(),
      telefone: d.telefone.trim(),
      mensagem: (d.mensagem || `Tenho interesse no ${nomeCarro}.`).trim(),
    });
    setEnviado(true);
  }

  if (enviado) {
    return (
      <section className="card border-emerald-300 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">Interesse registrado!</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Este é um showroom de demonstração: nenhuma mensagem foi enviada para ninguém. Você pode ver
          o registro no painel, na aba Interessados.
        </p>
        <button onClick={() => setEnviado(false)} className="mt-4 text-sm font-semibold text-emerald-900 underline underline-offset-4">
          Registrar outro interesse
        </button>
      </section>
    );
  }

  return (
    <section className="card p-6" aria-labelledby="int-titulo">
      <h2 id="int-titulo" className="text-xl font-semibold tracking-tight text-fg">Tenho interesse</h2>
      <p className="mt-1 text-sm text-muted">Deixe seus dados e um vendedor entra em contato (de mentira, é uma demonstração).</p>
      <form onSubmit={enviar} className="mt-5 space-y-4">
        <input name="nome" required minLength={2} maxLength={80} placeholder="Seu nome" aria-label="Seu nome" className="field" />
        <input name="telefone" required minLength={8} maxLength={20} placeholder="Telefone com DDD" aria-label="Telefone" inputMode="tel" className="field" />
        <textarea name="mensagem" rows={3} maxLength={400} placeholder={`Tenho interesse no ${nomeCarro}.`} aria-label="Mensagem" className="field" />
        <button className="btn-dark w-full">Quero ser contatado</button>
      </form>
    </section>
  );
}
