"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  REDES,
  concluida,
  isoParaLocal,
  quando,
  situacao,
  type Publicacao,
  type RedeId,
  type StatusRede,
} from "@/lib/publicacoes";
import { idEpisodio, series } from "@/lib/series";
import {
  alterarData,
  apagarVideo,
  excluirPublicacao,
  linkDoArquivo,
  marcarRede,
  publicarAgora,
  verificarRede,
} from "@/app/(site)/admin/publicacoes/actions";

const COR: Record<StatusRede, string> = {
  pendente: "bg-amber-100 text-amber-800",
  processando: "bg-sky-100 text-sky-800",
  publicado: "bg-emerald-100 text-emerald-800",
  erro: "bg-red-100 text-red-700",
};
const ROTULO: Record<StatusRede, string> = {
  pendente: "Pendente",
  processando: "Processando",
  publicado: "Publicado",
  erro: "Erro",
};

const ROTULOS_EPISODIO = new Map(
  series.flatMap((s) => s.episodios.map((e) => [idEpisodio(s.slug, e.numero), `${s.titulo} · Ep. ${e.numero}`] as const)),
);

export default function PublicacaoItem({ p, conectadas }: { p: Publicacao; conectadas: RedeId[] }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  const consultando = useRef(false);
  const [editando, setEditando] = useState(false);
  const [novaData, setNovaData] = useState("");
  const atencao = situacao(p) === "atencao";
  const podeEditarData = !concluida(p) && !Object.values(p.status_redes).includes("processando");
  const esperaInstagram = p.status_redes.instagram === "processando";

  // Enquanto o Instagram processa o vídeo, confere sozinho a cada 15 s e publica quando terminar.
  useEffect(() => {
    if (!esperaInstagram) return;
    let tentativas = 0;
    const id = setInterval(async () => {
      if (consultando.current || ++tentativas > 80) return;
      consultando.current = true;
      try {
        const r = await verificarRede(p.id, "instagram");
        if (r.ok && r.estado !== "processando") router.refresh();
      } finally {
        consultando.current = false;
      }
    }, 15000);
    return () => clearInterval(id);
  }, [esperaInstagram, p.id, router]);

  function salvarData(valor: string | null) {
    if (valor && Date.parse(`${valor}:00-03:00`) <= Date.now()) {
      if (!confirm("Essa data já passou. O agendador vai publicar em até 5 minutos. Continuar?")) return;
    }
    iniciar(async () => {
      const r = await alterarData(p.id, valor);
      setAviso(r.ok ? r.mensagem : r.erro);
      if (r.ok) {
        setEditando(false);
        router.refresh();
      }
    });
  }

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

  function publicar(rede: RedeId, nome: string, jaEnviado: boolean) {
    // Verificar andamento só consulta o Instagram sobre um vídeo já confirmado.
    if (!jaEnviado && !confirm(`Publicar agora no ${nome}? A postagem vai ao ar de verdade, na sua conta.`)) return;
    setAviso(jaEnviado ? `Consultando o ${nome}…` : `Enviando ao ${nome}… pode levar até um minuto.`);
    iniciar(async () => {
      const r = await publicarAgora(p.id, rede);
      setAviso(r.ok ? r.mensagem : r.erro);
    });
  }

  return (
    <li
      className={`card p-5 ${atencao ? "border-amber-300 ring-1 ring-amber-200" : ""} ${concluida(p) ? "opacity-70" : ""} ${pendente ? "opacity-60" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="font-semibold text-fg">{p.titulo}</p>
          {p.episodio && (
            <span className="mt-1 inline-block rounded-full bg-accent-strong/10 px-2.5 py-0.5 text-xs font-semibold text-accent-strong">
              Site: {ROTULOS_EPISODIO.get(p.episodio) ?? p.episodio}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-accent-strong">{quando(p.agendada_em)}</span>
          {podeEditarData && !editando && (
            <button
              className="ml-3 text-xs font-medium text-slate-500 underline-offset-2 hover:text-fg hover:underline"
              onClick={() => {
                setNovaData(isoParaLocal(p.agendada_em));
                setEditando(true);
              }}
            >
              Alterar data
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <input
            type="datetime-local"
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
            className="field w-auto"
            aria-label="Nova data e hora (horário de Brasília)"
          />
          <button
            className="rounded-lg bg-accent-strong px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent disabled:opacity-50"
            disabled={pendente || !novaData}
            onClick={() => salvarData(novaData)}
          >
            Salvar data
          </button>
          {p.agendada_em && (
            <button className={botao} disabled={pendente} onClick={() => salvarData(null)}>
              Remover data
            </button>
          )}
          <button className={botao} onClick={() => setEditando(false)}>
            Cancelar
          </button>
          <span className="w-full text-xs text-slate-500">Horário de Brasília. O site também usa esta data.</span>
        </div>
      )}

      <div className="space-y-3">
        {REDES.filter((r) => p.redes.includes(r.id)).map((r) => {
          const status = p.status_redes[r.id] ?? "pendente";
          const t = p.textos[r.id];
          const det = p.detalhes_redes?.[r.id];
          const podeAutomatico = r.automatica && conectadas.includes(r.id) && !!p.video_path;
          return (
            <div key={r.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-fg">{r.nome}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR[status]}`}>
                  {ROTULO[status]}
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {podeAutomatico && status !== "publicado" && (
                    <button
                      className="rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent disabled:opacity-50"
                      disabled={pendente}
                      onClick={() => publicar(r.id, r.nome, status === "processando")}
                    >
                      {status === "processando"
                        ? "Verificar andamento"
                        : status === "erro"
                          ? "Tentar de novo"
                          : "Publicar agora"}
                    </button>
                  )}
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
              {status === "erro" && det?.erro && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{det.erro}</p>
              )}
              {r.id === "instagram" && status === "processando" && (
                <p className="mt-2 text-xs text-sky-700">
                  Aguardando o Instagram processar o vídeo. O painel confere sozinho e publica quando terminar.
                </p>
              )}
              {det?.aviso && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{det.aviso}</p>
              )}
              {status === "publicado" && det?.permalink && (
                <a
                  href={det.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-accent-strong hover:underline"
                >
                  Ver a publicação →
                </a>
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
        {aviso && <span className="w-full text-xs text-slate-600">{aviso}</span>}
      </div>
    </li>
  );
}
