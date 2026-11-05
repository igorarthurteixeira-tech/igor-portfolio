"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chaveTipo, megas, outroPorUltimo, type TipoVideo } from "@/lib/etm";
import { useRascunho } from "@/lib/etm-rascunho";
import { enviarArquivos, type ProgressoEnvio } from "@/lib/etm-upload";
import { criarPedido, criarUploadUrlEtm } from "@/app/(site)/etm/actions";
import ModalNovoTipo from "./ModalNovoTipo";
import SeletorArquivos from "./SeletorArquivos";

type Rascunho = { titulo: string; tipo: string; prazo: string; urgente: boolean; descricao: string; link: string };

export default function FormPedido({ tipos, limite, usuarioId }: { tipos: TipoVideo[]; limite: number; usuarioId: string }) {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [lista, setLista] = useState(tipos);
  const [modal, setModal] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null);
  const [avisoVisto, setAvisoVisto] = useState(false);

  const { valores, atualizar, restaurado, limpar } = useRascunho<Rascunho>(`etm-pedido:${usuarioId}`, {
    titulo: "",
    tipo: tipos[0]?.rotulo ?? "",
    prazo: "",
    urgente: false,
    descricao: "",
    link: "",
  });

  // um tipo guardado no rascunho pode ter sido ocultado depois: cai para o primeiro da lista
  const tipo = lista.some((t) => t.rotulo === valores.tipo) ? valores.tipo : (lista[0]?.rotulo ?? "");
  const escolhido = lista.find((t) => t.rotulo === tipo);

  function tipoCriado(novo: TipoVideo) {
    // se já existia (mesmo nome, outra grafia), só seleciona o que existe
    if (!lista.some((t) => chaveTipo(t.rotulo) === chaveTipo(novo.rotulo))) setLista(outroPorUltimo([...lista, novo]));
    atualizar({ tipo: novo.rotulo });
    setModal(false);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const id = crypto.randomUUID();
    if (!tipo) return setErro("Escolha o tipo de pedido.");
    setEnviando(true);
    try {
      const enviados = await enviarArquivos(arquivos, (nome, tam) => criarUploadUrlEtm(id, nome, tam), setProgresso);
      const r = await criarPedido({
        id,
        titulo: valores.titulo,
        tipo,
        descricao: valores.descricao,
        prazo: valores.prazo || null,
        urgente: valores.urgente,
        link: valores.link,
        arquivos: enviados,
      });
      if (!r.ok) throw new Error(r.erro);
      limpar();
      router.push(`/etm/${r.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
      setEnviando(false);
      setProgresso(null);
    }
  }

  const pct = progresso && progresso.bytes ? Math.round((progresso.feito / progresso.bytes) * 100) : 0;

  return (
    <>
      <form onSubmit={enviar} className="card space-y-5 p-6 sm:p-8">
        {restaurado && !avisoVisto && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              <span className="font-semibold">Recuperamos o que você tinha preenchido.</span> Os arquivos precisam ser anexados de novo.
            </p>
            <span className="flex gap-3 font-semibold">
              <button type="button" onClick={() => setAvisoVisto(true)} className="hover:underline">
                Ok
              </button>
              <button type="button" onClick={limpar} className="text-red-700 hover:underline">
                Descartar rascunho
              </button>
            </span>
          </div>
        )}

        <div>
          <label htmlFor="titulo" className="mb-1.5 block text-sm font-semibold text-fg">Título do pedido</label>
          <input
            id="titulo"
            value={valores.titulo}
            onChange={(e) => atualizar({ titulo: e.target.value })}
            required
            minLength={3}
            maxLength={120}
            placeholder="Ex.: Recap do workshop de compressores"
            className="field"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo" className="mb-1.5 block text-sm font-semibold text-fg">Tipo de pedido</label>
            <div className="flex gap-2">
              <select id="tipo" value={tipo} onChange={(e) => atualizar({ tipo: e.target.value })} disabled={enviando} className="field min-w-0 flex-1">
                {lista.map((t) => (
                  <option key={t.rotulo} value={t.rotulo}>{t.rotulo}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setModal(true)}
                className="btn-outline shrink-0 px-4 py-3"
                title="Criar um tipo de pedido novo"
              >
                + Novo tipo
              </button>
            </div>
            {escolhido?.descricao && <p className="mt-2 text-xs leading-relaxed text-muted">{escolhido.descricao}</p>}
          </div>
          <div>
            <label htmlFor="prazo" className="mb-1.5 block text-sm font-semibold text-fg">Prazo desejado</label>
            <input id="prazo" type="date" value={valores.prazo} onChange={(e) => atualizar({ prazo: e.target.value })} className="field" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={valores.urgente}
            onChange={(e) => atualizar({ urgente: e.target.checked })}
            className="h-4 w-4 accent-accent-strong"
          />
          Pedido urgente
        </label>

        <div>
          <label htmlFor="descricao" className="mb-1.5 block text-sm font-semibold text-fg">O que você precisa</label>
          <textarea
            id="descricao"
            value={valores.descricao}
            onChange={(e) => atualizar({ descricao: e.target.value })}
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            placeholder="Conte o objetivo, onde vai ser publicado, quem aparece, o que não pode faltar e o que precisa ficar de fora."
            className="field resize-y"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-fg">Fotos e vídeos do material</p>
          <p className="mb-3 text-xs text-muted">Até 10 arquivos de {megas(limite)} MB cada.</p>
          <SeletorArquivos arquivos={arquivos} onChange={setArquivos} onErro={setErro} disabled={enviando} limite={limite} />
        </div>

        <div>
          <label htmlFor="link" className="mb-1.5 block text-sm font-semibold text-fg">Link da pasta (opcional)</label>
          <input
            id="link"
            type="url"
            value={valores.link}
            onChange={(e) => atualizar({ link: e.target.value })}
            placeholder="https://drive.google.com/..."
            className="field"
          />
          <p className="mt-1.5 text-xs text-muted">Para material que não cabe no envio, como vídeos grandes.</p>
        </div>

        {enviando && progresso && (
          <div className="rounded-lg bg-page px-4 py-3 text-sm">
            <p className="mb-2 text-fg">
              Enviando {progresso.indice} de {progresso.total}: {progresso.nome} ({pct}%)
            </p>
            <div className="h-1.5 rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-accent-strong transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button disabled={enviando} className="btn-dark w-full sm:w-auto">
            {enviando ? "Enviando..." : "Enviar pedido"}
          </button>
          <p className="text-xs text-muted">O que você escreve fica salvo neste navegador até o pedido ser enviado. Os arquivos não.</p>
        </div>
      </form>

      {/* fora do <form>: o Enter dentro do modal não pode enviar o pedido */}
      {modal && <ModalNovoTipo onFechar={() => setModal(false)} onCriado={tipoCriado} />}
    </>
  );
}
