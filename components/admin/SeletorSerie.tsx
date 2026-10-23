"use client";

import type { ItemCatalogo } from "@/lib/series-videos";

export type EstadoSerie = {
  /** "" = nenhuma; "nova" = criar; senão, o slug de uma série existente. */
  escolha: string;
  numero: string;
  epTitulo: string;
  resumo: string;
  nome: string;
  chamada: string;
  descricao: string;
};

export const SERIE_VAZIA: EstadoSerie = {
  escolha: "",
  numero: "",
  epTitulo: "",
  resumo: "",
  nome: "",
  chamada: "",
  descricao: "",
};

/** Próximo número livre de uma série do painel. */
export const proximoNumero = (s?: ItemCatalogo) => String(Math.max(0, ...(s?.episodios.map((e) => e.numero) ?? [])) + 1);

export default function SeletorSerie({
  catalogo,
  valor,
  aoMudar,
  duracao,
}: {
  catalogo: ItemCatalogo[];
  valor: EstadoSerie;
  aoMudar: (v: EstadoSerie) => void;
  /** Duração lida do vídeo escolhido (ex.: "1:32"), só para mostrar. */
  duracao: string | null;
}) {
  const atual = catalogo.find((s) => s.slug === valor.escolha);
  const nova = valor.escolha === "nova";
  const doCodigo = atual?.origem === "codigo";
  const doPainel = atual?.origem === "painel" || nova;
  const set = (parcial: Partial<EstadoSerie>) => aoMudar({ ...valor, ...parcial });

  function escolher(escolha: string) {
    const s = catalogo.find((x) => x.slug === escolha);
    aoMudar({
      ...SERIE_VAZIA,
      escolha,
      numero: escolha === "nova" ? "1" : s?.origem === "painel" ? proximoNumero(s) : "",
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <label className="block text-sm text-muted">
        Série (opcional)
        <select value={valor.escolha} onChange={(e) => escolher(e.target.value)} className="field mt-1">
          <option value="">Nenhuma</option>
          {catalogo.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.titulo}
            </option>
          ))}
          <option value="nova">+ Criar nova série</option>
        </select>
      </label>

      {nova && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nova série</p>
          <input
            value={valor.nome}
            onChange={(e) => set({ nome: e.target.value })}
            className="field"
            placeholder="Nome da série (ex.: Salão Reservado)"
            maxLength={60}
            required
          />
          <input
            value={valor.chamada}
            onChange={(e) => set({ chamada: e.target.value })}
            className="field"
            placeholder="Frase de chamada (ex.: Um caderno, seis vizinhos e zero paz.)"
            maxLength={120}
          />
          <textarea
            value={valor.descricao}
            onChange={(e) => set({ descricao: e.target.value })}
            className="field min-h-24"
            placeholder="Descrição que aparece na página da série"
            maxLength={600}
          />
        </div>
      )}

      {doCodigo && atual && (
        <label className="block text-sm text-muted">
          Episódio
          <select value={valor.numero} onChange={(e) => set({ numero: e.target.value })} className="field mt-1" required>
            <option value="">Escolha o episódio</option>
            {atual.episodios.map((e) => (
              <option key={e.numero} value={e.numero}>
                Ep. {e.numero}: {e.titulo}
              </option>
            ))}
          </select>
        </label>
      )}

      {doPainel && (
        <div className="space-y-2">
          {atual && atual.episodios.length > 0 && (
            <p className="text-xs text-slate-500">
              Já na série: {atual.episodios.map((e) => `Ep. ${e.numero}`).join(", ")}.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
            <input
              type="number"
              min={1}
              max={999}
              value={valor.numero}
              onChange={(e) => set({ numero: e.target.value })}
              className="field"
              placeholder="Nº"
              aria-label="Número do episódio"
              required
            />
            <input
              value={valor.epTitulo}
              onChange={(e) => set({ epTitulo: e.target.value })}
              className="field"
              placeholder="Título do episódio"
              maxLength={120}
              required
            />
          </div>
          <textarea
            value={valor.resumo}
            onChange={(e) => set({ resumo: e.target.value })}
            className="field min-h-20"
            placeholder="Resumo do episódio (aparece no site quando ele estreia; evite entregar a virada)"
            maxLength={300}
          />
          <p className="text-xs text-slate-500">
            A <strong>capa</strong> que você enviar abaixo vira a imagem do episódio no site (obrigatória).
            {duracao ? ` Duração lida do vídeo: ${duracao}.` : " A duração é lida do vídeo."}
          </p>
        </div>
      )}

      {valor.escolha && (
        <p className="text-xs text-slate-500">
          Com o YouTube marcado, o site passa a exibir este vídeo no episódio sozinho, assim que ele estiver público.
        </p>
      )}
    </div>
  );
}
