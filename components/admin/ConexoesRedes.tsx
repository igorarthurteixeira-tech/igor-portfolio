"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { diasRestantes, type Conexao } from "@/lib/publicacoes";
import { conectarInstagram, desconectarRede } from "@/app/(site)/admin/publicacoes/actions";

export default function ConexoesRedes({ conexoes }: { conexoes: Conexao[] }) {
  const router = useRouter();
  const insta = conexoes.find((c) => c.rede === "instagram");
  const yt = conexoes.find((c) => c.rede === "youtube");
  const params = useSearchParams();
  const retorno = params.get("youtube");
  const aviso = retorno
    ? {
        ok: retorno === "ok",
        texto:
          {
            ok: "YouTube conectado.",
            negado: "Você não autorizou o acesso no Google.",
            invalido: "A autorização não pôde ser confirmada. Tente de novo.",
            "sem-configuracao": "As chaves do Google ainda não estão configuradas no servidor.",
            erro: "Não foi possível concluir a conexão com o YouTube.",
          }[retorno] ?? "Não foi possível concluir a conexão com o YouTube.",
      }
    : null;
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

      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-fg">YouTube</span>
          {yt ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Conectado{yt.conta_nome ? ` · ${yt.conta_nome}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Não conectado
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <a
              href="/api/redes/youtube/conectar"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {yt ? "Reconectar com o Google" : "Conectar com o Google"}
            </a>
            {yt && (
              <button
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                disabled={pendente}
                onClick={() => {
                  if (confirm("Desconectar o YouTube? O acesso guardado será apagado.")) {
                    iniciar(async () => {
                      await desconectarRede("youtube");
                      router.refresh();
                    });
                  }
                }}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
        {aviso && (
          <p className={`mt-2 text-sm ${aviso.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
            {aviso.texto}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Enquanto o projeto do Google não passar pela auditoria, os vídeos enviados ficam privados e você muda a
          visibilidade no YouTube Studio.
        </p>
      </div>
    </div>
  );
}
