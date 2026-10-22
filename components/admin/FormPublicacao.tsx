"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { BUCKET, LIMITE_ARQUIVO, REDES, localParaIso, type RedeId, type Textos } from "@/lib/publicacoes";
import { criarUploadUrl, salvarPublicacao } from "@/app/(site)/admin/publicacoes/actions";

async function enviar(arquivo: File, tipo: "video" | "capa"): Promise<string> {
  const pre = await criarUploadUrl(arquivo.name, tipo, arquivo.size);
  if (!pre.ok) throw new Error(pre.erro);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) throw new Error("Supabase não configurado.");
  const sb = createClient(url, chave, { auth: { persistSession: false } });
  const { error } = await sb.storage
    .from(BUCKET)
    .uploadToSignedUrl(pre.path, pre.token, arquivo, { contentType: arquivo.type || undefined });
  if (error) throw new Error("Falha ao enviar o arquivo.");
  return pre.path;
}

export default function FormPublicacao() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [redes, setRedes] = useState<RedeId[]>(["instagram", "youtube"]);
  const [textos, setTextos] = useState<Textos>({});
  const [quando, setQuando] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
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
        setMsg({ ok: true, texto: v ? "Enviando o vídeo… pode levar um minuto." : "Salvando…" });
        const videoPath = v ? await enviar(v, "video") : null;
        const capaPath = c ? await enviar(c, "capa") : null;
        const r = await salvarPublicacao({
          titulo,
          redes,
          textos,
          agendadaEm: localParaIso(quando),
          videoPath,
          capaPath,
        });
        if (!r.ok) throw new Error(r.erro);
        setTitulo("");
        setTextos({});
        setQuando("");
        if (video.current) video.current.value = "";
        if (capa.current) capa.current.value = "";
        setMsg({ ok: true, texto: "Publicação salva na fila." });
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, texto: err instanceof Error ? err.message : "Erro ao salvar." });
      }
    });
  }

  return (
    <form onSubmit={salvar} className="card mb-10 space-y-5 p-6">
      <h2 className="text-lg font-semibold text-fg">Nova publicação</h2>

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
          <input ref={video} type="file" accept="video/mp4,video/quicktime" className="field mt-1" />
        </label>
        <label className="text-sm text-muted">
          Capa (imagem)
          <input ref={capa} type="file" accept="image/jpeg,image/png" className="field mt-1" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pendente} className="btn-dark px-6! py-2.5!">
          {pendente ? "Salvando…" : "Adicionar à fila"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">
            {msg.texto}
          </p>
        )}
      </div>
    </form>
  );
}
