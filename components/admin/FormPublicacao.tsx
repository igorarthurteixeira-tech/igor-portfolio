"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BUCKET, FORMATOS, LIMITE_ARQUIVO, REDES, localParaIso, type RedeId, type Textos } from "@/lib/publicacoes";
import { criarUploadUrl, salvarPublicacao } from "@/app/(site)/admin/publicacoes/actions";
import type { ItemCatalogo } from "@/lib/series-videos";
import SeletorSerie, { SERIE_VAZIA, type EstadoSerie } from "./SeletorSerie";

type Progresso = { rotulo: string; feito: number; total: number };

/** Duração do vídeo escolhido, lida no próprio navegador (ex.: "1:32"). */
function duracaoDoVideo(arquivo: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const s = Math.round(el.duration);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("");
    };
    el.src = url;
  });
}

const mb = (n: number) => (n / 1048576).toFixed(1).replace(".", ",");

/** Envio direto ao Storage com XHR, que (ao contrário do fetch) informa o andamento. */
async function enviar(
  arquivo: File,
  tipo: "video" | "capa",
  rotulo: string,
  aoProgredir: (p: Progresso) => void,
): Promise<string> {
  const pre = await criarUploadUrl(arquivo.name, tipo, arquivo.size);
  if (!pre.ok) throw new Error(pre.erro);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) throw new Error("Supabase não configurado.");

  const corpo = new FormData();
  corpo.append("cacheControl", "3600");
  corpo.append("", arquivo);

  aoProgredir({ rotulo, feito: 0, total: arquivo.size });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${url}/storage/v1/object/upload/sign/${BUCKET}/${pre.path}?token=${pre.token}`);
    xhr.setRequestHeader("apikey", chave);
    xhr.setRequestHeader("authorization", `Bearer ${chave}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir({ rotulo, feito: Math.min(e.loaded, arquivo.size), total: arquivo.size });
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Falha ao enviar o arquivo."));
    xhr.onerror = () => reject(new Error("Falha de conexão ao enviar o arquivo."));
    xhr.send(corpo);
  });
  return pre.path;
}

export default function FormPublicacao({ catalogo }: { catalogo: ItemCatalogo[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [redes, setRedes] = useState<RedeId[]>(["instagram", "youtube"]);
  const [textos, setTextos] = useState<Textos>({});
  const [quando, setQuando] = useState("");
  const [serie, setSerie] = useState<EstadoSerie>(SERIE_VAZIA);
  const [duracao, setDuracao] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const video = useRef<HTMLInputElement>(null);
  const capa = useRef<HTMLInputElement>(null);

  const alternar = (r: RedeId) =>
    setRedes((atual) => (atual.includes(r) ? atual.filter((x) => x !== r) : [...atual, r]));
  const mudar = (r: RedeId, campo: "titulo" | "legenda", v: string) =>
    setTextos((t) => ({ ...t, [r]: { ...t[r], [campo]: v } }));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      try {
        const v = video.current?.files?.[0];
        const c = capa.current?.files?.[0];
        if ((v && v.size > LIMITE_ARQUIVO) || (c && c.size > LIMITE_ARQUIVO)) {
          throw new Error("Arquivo acima de 50 MB. Comprima o vídeo antes de enviar.");
        }
        const duracaoVideo = v ? await duracaoDoVideo(v) : "";
        const videoPath = v ? await enviar(v, "video", "Enviando o vídeo", setProgresso) : null;
        const capaPath = c ? await enviar(c, "capa", "Enviando a capa", setProgresso) : null;
        setProgresso({ rotulo: "Salvando na fila", feito: 1, total: 1 });
        const r = await salvarPublicacao({
          titulo,
          redes,
          textos,
          agendadaEm: localParaIso(quando),
          videoPath,
          capaPath,
          serie: serie.escolha
            ? {
                escolha: serie.escolha,
                numero: Number(serie.numero),
                epTitulo: serie.epTitulo,
                resumo: serie.resumo,
                duracao: duracaoVideo,
                nome: serie.nome,
                chamada: serie.chamada,
                descricao: serie.descricao,
              }
            : null,
        });
        if (!r.ok) throw new Error(r.erro);
        setTitulo("");
        setTextos({});
        setQuando("");
        setSerie(SERIE_VAZIA);
        setDuracao(null);
        if (video.current) video.current.value = "";
        if (capa.current) capa.current.value = "";
        setMsg({ ok: true, texto: "Publicação salva na fila." });
        router.push("/admin/publicacoes?aba=fila");
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, texto: err instanceof Error ? err.message : "Erro ao salvar." });
      } finally {
        setProgresso(null);
      }
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-5 p-6">

      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="field"
          placeholder="Título interno (ex.: Expediente, Ep. 1)"
          maxLength={120}
          required
        />
        <input
          type="datetime-local"
          value={quando}
          onChange={(e) => setQuando(e.target.value)}
          className="field"
          aria-label="Data e hora (horário de Brasília)"
        />
      </div>

      <SeletorSerie catalogo={catalogo} valor={serie} aoMudar={setSerie} duracao={duracao} />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Redes</p>
        <div className="flex flex-wrap gap-2">
          {REDES.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => alternar(r.id)}
              aria-pressed={redes.includes(r.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                redes.includes(r.id)
                  ? "border-accent-strong bg-accent-strong text-white"
                  : "border-line bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {r.nome}
            </button>
          ))}
        </div>
      </div>

      {REDES.filter((r) => redes.includes(r.id)).map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-fg">{r.nome}</p>
          {r.titulo && (
            <input
              value={textos[r.id]?.titulo ?? ""}
              onChange={(e) => mudar(r.id, "titulo", e.target.value)}
              className="field"
              placeholder={`Título no ${r.nome}`}
              maxLength={120}
            />
          )}
          <textarea
            value={textos[r.id]?.legenda ?? ""}
            onChange={(e) => mudar(r.id, "legenda", e.target.value)}
            className="field min-h-28"
            placeholder={`Legenda / descrição do ${r.nome}`}
            maxLength={5000}
          />
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-muted">
          Vídeo (MP4, até 50 MB)
          <input
            ref={video}
            type="file"
            accept="video/mp4,video/quicktime"
            className="field mt-1"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setDuracao(f ? await duracaoDoVideo(f) : null);
            }}
          />
        </label>
        <label className="text-sm text-muted">
          Capa (imagem)
          <input ref={capa} type="file" accept="image/jpeg,image/png" className="field mt-1" />
        </label>
      </div>

      {redes.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-fg">Formato ideal por rede</p>
          <ul className="space-y-2">
            {REDES.filter((r) => redes.includes(r.id)).map((r) => (
              <li key={r.id}>
                <span className="font-medium text-fg">{r.nome}</span>
                <br />
                <span className="text-slate-500">Vídeo:</span> {FORMATOS[r.id].video}
                <br />
                <span className="text-slate-500">Capa:</span> {FORMATOS[r.id].capa}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            O arquivo enviado é usado como está, para todas as redes marcadas. Para redes com formato
            diferente, crie uma publicação separada com o vídeo na proporção certa.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pendente} className="btn-dark px-6! py-2.5!">
          {pendente ? "Salvando…" : "Adicionar à fila"}
        </button>
        {msg && !progresso && (
          <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
            {msg.texto}
          </p>
        )}
      </div>

      {progresso && (
        <div role="status" aria-live="polite">
          <div className="mb-1 flex justify-between text-sm text-slate-600">
            <span>{progresso.rotulo}…</span>
            <span>
              {progresso.total > 1
                ? `${Math.round((progresso.feito / progresso.total) * 100)}% · ${mb(progresso.feito)} de ${mb(progresso.total)} MB`
                : ""}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-accent-strong transition-[width] duration-200"
              style={{ width: `${Math.round((progresso.feito / progresso.total) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </form>
  );
}
