"use client";

import { useState, useTransition } from "react";
import { REDES, concluida, quando, type Publicacao, type RedeId, type StatusRede } from "@/lib/publicacoes";
import { apagarVideo, excluirPublicacao, linkDoArquivo, marcarRede } from "@/app/(site)/admin/publicacoes/actions";

const COR: Record<StatusRede, string> = {
  pendente: "bg-amber-100 text-amber-800",
  publicado: "bg-emerald-100 text-emerald-800",
  erro: "bg-red-100 text-red-700",
};
const ROTULO: Record<StatusRede, string> = { pendente: "Pendente", publicado: "Publicado", erro: "Erro" };

export default function PublicacaoItem({ p }: { p: Publicacao }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const botao =
    "rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

  async function copiar(texto: string, nome: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`${nome} copiado.`);
    } catch {
      setAviso("Não foi possível copiar.");
    }
    setTimeout(() => setAviso(null), 2500);
  }

  async function abrir(path: string) {
    const r = await linkDoArquivo(path);
    if (r.ok) window.open(r.url, "_blank", "noopener");
    else setAviso(r.erro);
  }

  const proxima = (r: RedeId) => {
    const atual = p.status_redes[r] ?? "pendente";
    return (atual === "publicado" ? "pendente" : "publicado") as StatusRede;
  };

  return (
    <li className={`card p-5 ${concluida(p) ? "opacity-70" : ""} ${pendente ? "opacity-50" : ""}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-semibold text-fg">{p.titulo}</p>
        <span className="text-sm font-medium text-accent-strong">{quando(p.agendada_em)}</span>
      </div>

      <div className="space-y-3">
        {REDES.filter((r) => p.redes.includes(r.id)).map((r) => {
          const status = p.status_redes[r.id] ?? "pendente";
          const t = p.textos[r.id];
          return (
            <div key={r.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-fg">{r.nome}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR[status]}`}>
                  {ROTULO[status]}
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {r.titulo && t?.titulo && (
                    <button className={botao} onClick={() => copiar(t.titulo ?? "", "Título")}>
                      Copiar título
                    </button>
                  )}
                  {t?.legenda && (
                    <button className={botao} onClick={() => copiar(t.legenda ?? "", "Legenda")}>
                      Copiar legenda
                    </button>
                  )}
                  <button
                    className={botao}
                    onClick={() => iniciar(async () => void (await marcarRede(p.id, r.id, proxima(r.id))))}
                  >
                    {status === "publicado" ? "Desmarcar" : "Marcar como publicado"}
                  </button>
                </div>
              </div>
              {t?.legenda && (
                <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-muted">{t.legenda}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.video_path && (
          <button className={botao} onClick={() => abrir(p.video_path as string)}>
            Abrir vídeo
          </button>
        )}
        {p.capa_path && (
          <button className={botao} onClick={() => abrir(p.capa_path as string)}>
            Abrir capa
          </button>
        )}
        {p.video_path && concluida(p) && (
          <button
            className={botao}
            onClick={() => iniciar(async () => void (await apagarVideo(p.id)))}
            title="Libera espaço no Storage"
          >
            Apagar vídeo do Storage
          </button>
        )}
        <button
          className={`${botao} ml-auto text-red-600 hover:border-red-300 hover:bg-red-50`}
          onClick={() => {
            if (confirm("Excluir esta publicação e os arquivos dela?")) {
              iniciar(async () => void (await excluirPublicacao(p.id)));
            }
          }}
        >
          Excluir
        </button>
        {aviso && <span className="w-full text-xs text-emerald-700">{aviso}</span>}
      </div>
    </li>
  );
}
