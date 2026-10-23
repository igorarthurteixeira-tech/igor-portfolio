"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { diasRestantes, type Conexao } from "@/lib/publicacoes";
import { conectarInstagram, desconectarRede } from "@/app/(site)/admin/publicacoes/actions";

export default function ConexoesRedes({ conexoes }: { conexoes: Conexao[] }) {
  const router = useRouter();
  const insta = conexoes.find((c) => c.rede === "instagram");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const dias = diasRestantes(insta?.expira_em ?? null);

  function conectar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await conectarInstagram(token);
      if (r.ok) {
        setToken("");
        setMsg({ ok: true, texto: `Conectado: @${r.conta}.` });
        router.refresh();
      } else {
        setMsg({ ok: false, texto: r.erro });
      }
    });
  }

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-1 text-lg font-semibold text-fg">Conexões</h2>
      <p className="mb-4 text-sm text-muted">
        O token fica guardado só no servidor e é renovado sozinho antes de vencer.
      </p>

      <div className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-fg">Instagram</span>
          {insta ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Conectado{insta.conta_nome ? ` · @${insta.conta_nome}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Não conectado
            </span>
          )}
          {insta && dias !== null && (
            <span className="text-xs text-slate-500">token válido por mais {dias} dias</span>
          )}
          {insta && (
            <button
              className="ml-auto rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
              disabled={pendente}
              onClick={() => {
                if (confirm("Desconectar o Instagram? O token será apagado.")) {
                  iniciar(async () => {
                    await desconectarRede("instagram");
                    router.refresh();
                  });
                }
              }}
            >
              Desconectar
            </button>
          )}
        </div>

        <form onSubmit={conectar} className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="field min-w-0 flex-1"
            placeholder={insta ? "Colar um token novo para reconectar" : "Cole aqui o token do Instagram"}
            autoComplete="off"
            spellCheck={false}
          />
          <button disabled={pendente || token.trim().length < 20} className="btn-dark px-5! py-2.5!">
            {pendente ? "Conferindo…" : insta ? "Reconectar" : "Conectar"}
          </button>
        </form>
        {msg && (
          <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
            {msg.texto}
          </p>
        )}
      </div>
    </div>
  );
}
