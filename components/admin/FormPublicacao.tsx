"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FORMATOS,
  LIMITE_ARQUIVO,
  LIMITE_CARROSSEL,
  REDES,
  localParaIso,
  type RedeId,
  type Textos,
  type TipoPublicacao,
} from "@/lib/publicacoes";
import { criarUploadUrl, salvarPublicacao } from "@/app/(site)/admin/publicacoes/actions";
import type { ItemCatalogo } from "@/lib/series-videos";
import SeletorSerie, { SERIE_VAZIA, type EstadoSerie } from "./SeletorSerie";

type Progresso = { rotulo: string; feito: number; total: number };

/** Uma imagem escolhida para o carrossel, com a prévia e o tamanho original. */
type ImagemEscolhida = { id: string; arquivo: File; previa: string; larg: number; alt: number };

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

/** O Instagram só aceita JPEG: converte (PNG ou outro) no navegador, com fundo branco. */
async function paraJpeg(arquivo: File): Promise<File> {
  const imagem = await createImageBitmap(arquivo);
  const tela = document.createElement("canvas");
  tela.width = imagem.width;
  tela.height = imagem.height;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("Não foi possível converter a imagem.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  ctx.drawImage(imagem, 0, 0);
  imagem.close();
  const blob = await new Promise<Blob | null>((r) => tela.toBlob(r, "image/jpeg", 0.92));
  if (!blob) throw new Error("Não foi possível converter a imagem.");
  return new File([blob], `${arquivo.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

/** Envio direto ao Storage com XHR, que (ao contrário do fetch) informa o andamento. */
async function enviar(
  arquivo: File,
  tipo: "video" | "capa" | "imagem",
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
    xhr.open("PUT", `${url}/storage/v1/object/upload/sign/${pre.bucket}/${pre.path}?token=${pre.token}`);
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

/** Lê a largura e a altura de uma imagem escolhida. */
async function medir(arquivo: File) {
  const b = await createImageBitmap(arquivo);
  const medidas = { larg: b.width, alt: b.height };
  b.close();
  return medidas;
}

const BOTAO_MINI =
  "rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 disabled:opacity-40";

export default function FormPublicacao({ catalogo }: { catalogo: ItemCatalogo[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoPublicacao>("video");
  const [titulo, setTitulo] = useState("");
  const [redes, setRedes] = useState<RedeId[]>(["instagram", "youtube"]);
  const [textos, setTextos] = useState<Textos>({});
  const [quando, setQuando] = useState("");
  const [serie, setSerie] = useState<EstadoSerie>(SERIE_VAZIA);
  const [duracao, setDuracao] = useState<string | null>(null);
  const [imagens, setImagens] = useState<ImagemEscolhida[]>([]);
  const [noSite, setNoSite] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const video = useRef<HTMLInputElement>(null);
  const capa = useRef<HTMLInputElement>(null);
  const seletorImagens = useRef<HTMLInputElement>(null);

  const carrossel = tipo === "carrossel";
  const redesAtivas: RedeId[] = carrossel ? ["instagram"] : redes;

  const alternar = (r: RedeId) =>
    setRedes((atual) => (atual.includes(r) ? atual.filter((x) => x !== r) : [...atual, r]));
  const mudar = (r: RedeId, campo: "titulo" | "legenda", v: string) =>
    setTextos((t) => ({ ...t, [r]: { ...t[r], [campo]: v } }));

  async function escolherImagens(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const novas: ImagemEscolhida[] = [];
    for (const arquivo of Array.from(lista)) {
      try {
        const { larg, alt } = await medir(arquivo);
        novas.push({ id: crypto.randomUUID(), arquivo, previa: URL.createObjectURL(arquivo), larg, alt });
      } catch {
        setMsg({ ok: false, texto: `Não consegui abrir "${arquivo.name}". Use JPEG ou PNG.` });
      }
    }
    setImagens((atual) => [...atual, ...novas].slice(0, LIMITE_CARROSSEL));
    if (imagens.length + novas.length > LIMITE_CARROSSEL) {
      setMsg({ ok: false, texto: `O Instagram aceita no máximo ${LIMITE_CARROSSEL} imagens. As demais foram ignoradas.` });
    }
    if (seletorImagens.current) seletorImagens.current.value = "";
  }

  const mover = (i: number, d: -1 | 1) =>
    setImagens((atual) => {
      const j = i + d;
      if (j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  const remover = (i: number) =>
    setImagens((atual) => {
      URL.revokeObjectURL(atual[i].previa);
      return atual.filter((_, k) => k !== i);
    });

  // Todas as imagens são cortadas na proporção da primeira; o Instagram só aceita de 4:5 a 1,91:1.
  const proporcao = imagens[0] ? imagens[0].larg / imagens[0].alt : 0;
  const avisos: string[] = [];
  if (imagens[0] && (proporcao < 0.8 - 0.005 || proporcao > 1.91 + 0.005)) {
    avisos.push("A primeira imagem está fora da proporção aceita pelo Instagram (de 4:5 a 1,91:1).");
  }
  if (imagens.some((im) => Math.abs(im.larg / im.alt - proporcao) > 0.02)) {
    avisos.push("As imagens têm proporções diferentes: o Instagram corta todas na proporção da primeira.");
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      try {
        if (carrossel) {
          if (imagens.length < 2) throw new Error("Escolha de 2 a 10 imagens para o carrossel.");
          const caminhos: string[] = [];
          for (let i = 0; i < imagens.length; i++) {
            const jpeg = await paraJpeg(imagens[i].arquivo);
            caminhos.push(await enviar(jpeg, "imagem", `Enviando a imagem ${i + 1} de ${imagens.length}`, setProgresso));
          }
          setProgresso({ rotulo: "Salvando na fila", feito: 1, total: 1 });
          const r = await salvarPublicacao({
            titulo,
            redes: ["instagram"],
            textos,
            agendadaEm: localParaIso(quando),
            videoPath: null,
            capaPath: null,
            serie: null,
            tipo: "carrossel",
            imagens: caminhos,
            noSite,
          });
          if (!r.ok) throw new Error(r.erro);
          imagens.forEach((im) => URL.revokeObjectURL(im.previa));
          setImagens([]);
        } else {
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
          setSerie(SERIE_VAZIA);
          setDuracao(null);
          if (video.current) video.current.value = "";
          if (capa.current) capa.current.value = "";
        }
        setTitulo("");
        setTextos({});
        setQuando("");
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
      <div className="flex gap-2" role="group" aria-label="Tipo de publicação">
        {([
          ["video", "Vídeo"],
          ["carrossel", "Carrossel de imagens"],
        ] as const).map(([id, rotulo]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTipo(id)}
            aria-pressed={tipo === id}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              tipo === id
                ? "border-fg bg-fg text-white"
                : "border-line bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="field"
          placeholder={carrossel ? "Título (vira o endereço da página no site)" : "Título interno (ex.: Expediente, Ep. 1)"}
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

      {!carrossel && <SeletorSerie catalogo={catalogo} valor={serie} aoMudar={setSerie} duracao={duracao} />}

      {!carrossel && (
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
      )}

      {REDES.filter((r) => redesAtivas.includes(r.id)).map((r) => (
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
            maxLength={carrossel ? 2200 : 5000}
          />
        </div>
      ))}

      {carrossel ? (
        <div className="space-y-3">
          <label className="block text-sm text-muted">
            Imagens do carrossel (de 2 a {LIMITE_CARROSSEL}, JPEG ou PNG)
            <input
              ref={seletorImagens}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="field mt-1"
              onChange={(e) => escolherImagens(e.target.files)}
            />
          </label>

          {imagens.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {imagens.map((im, i) => (
                <li key={im.id} className="rounded-xl border border-line p-2">
                  <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.previa} alt={`Slide ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <button type="button" className={BOTAO_MINI} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para antes">
                      ←
                    </button>
                    <button type="button" className={BOTAO_MINI} onClick={() => mover(i, 1)} disabled={i === imagens.length - 1} aria-label="Mover para depois">
                      →
                    </button>
                    <button type="button" className={`${BOTAO_MINI} text-red-600`} onClick={() => remover(i)}>
                      Tirar
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {avisos.map((a) => (
            <p key={a} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {a}
            </p>
          ))}

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={noSite} onChange={(e) => setNoSite(e.target.checked)} className="mt-1" />
            <span>
              Mostrar também no portfólio (página <strong>Conteúdos</strong>). Aparece no site quando for publicado no
              Instagram.
            </span>
          </label>

          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-fg">Formato ideal</p>
            <p className="mt-1">{FORMATOS.instagram.carrossel}</p>
            <p className="mt-1 text-slate-500">
              As imagens são convertidas para JPEG no seu navegador antes de subir. O carrossel só é publicado no
              Instagram (YouTube e LinkedIn não entram).
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {!carrossel && redes.length > 0 && (
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
