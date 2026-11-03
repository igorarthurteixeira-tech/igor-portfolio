"use client";

import { useState } from "react";
import {
  LADO_ROTULO,
  descricoes,
  descricoesCadeados,
  descricoesLigacoes,
  externos,
  sistemas,
  subsistemas,
  type Lado,
} from "@/lib/sistema";
import css from "./sistema.module.css";

// Organograma compacto, para telas estreitas: o mesmo conteúdo do mapa (lib/sistema.ts), em árvore.
// Toque num item para ler o que ele é, o ponto de contato e as conexões.
const ZONAS: { lado: Lado; titulo: string; ids: string[] }[] = [
  { lado: "internet", titulo: "Na internet", ids: ["site", "ide"] },
  { lado: "interno", titulo: "Dentro da paróquia", ids: ["paroquial", "ambulatorial", "loja"] },
];

const sistemaPorId = new Map(sistemas.map((s) => [s.id, s]));
const paiDe = new Map<string, string>([...subsistemas.map((s) => [s.id, s.pai] as const), ...externos.map((e) => [e.id, e.de] as const)]);
const nomeDe = new Map<string, string>([
  ...sistemas.map((s) => [s.id, s.nome.join(" ")] as const),
  ...subsistemas.map((s) => [s.id, s.nome.join(" ")] as const),
  ...externos.map((e) => [e.id, e.nome.join(" ")] as const),
]);
const projetos = new Set([...subsistemas.filter((s) => s.projeto).map((s) => s.id), ...externos.filter((e) => e.projeto).map((e) => e.id)]);

const filhosDe = (id: string) => [...subsistemas.filter((s) => s.pai === id).map((s) => s.id), ...externos.filter((e) => e.de === id).map((e) => e.id)];

const raizDe = (id: string): string => {
  let atual = id;
  for (let i = 0; i < 10 && !sistemaPorId.has(atual); i++) atual = paiDe.get(atual) ?? atual;
  return atual;
};

const ladoDe = (id: string): Lado => {
  const s = sistemaPorId.get(id);
  if (s) return s.lado;
  const e = externos.find((x) => x.id === id);
  if (e) return e.lado ?? "internet";
  return ladoDe(paiDe.get(id) ?? "");
};

const conexoesDe = (id: string) =>
  Object.entries(descricoesLigacoes)
    .filter(([par]) => par.split(">").includes(id))
    .map(([par, texto]) => {
      const outro = par.split(">").find((x) => x !== id) ?? "";
      return { par, outro: nomeDe.get(outro) ?? outro, texto };
    });

export default function Lista() {
  const [aberto, setAberto] = useState<string | null>(null);

  const No = ({ id, raiz = false }: { id: string; raiz?: boolean }) => {
    const pai = paiDe.get(id);
    const outroLado = !raiz && pai !== undefined && ladoDe(id) !== ladoDe(pai);
    const cor = sistemaPorId.get(raizDe(id))!.cor;
    return (
      <button
        type="button"
        className={`${css.no} ${raiz ? css.noRaiz : ""} ${projetos.has(id) ? css.noProjeto : ""} ${aberto === id ? css.noAberto : ""}`}
        style={{ "--cor": cor } as React.CSSProperties}
        aria-pressed={aberto === id}
        onClick={() => setAberto(aberto === id ? null : id)}
      >
        <span className={css.noNome}>
          {nomeDe.get(id)}
          {descricoesCadeados[id] && <span aria-label="ponto de contato com a internet"> 🔒</span>}
        </span>
        {outroLado && <span className={css.noLado}>{LADO_ROTULO[ladoDe(id)]}</span>}
        {projetos.has(id) && <span className={css.noLado}>projeto</span>}
      </button>
    );
  };

  const Ramo = ({ id }: { id: string }) => {
    const filhos = filhosDe(id);
    const folhas = filhos.filter((f) => filhosDe(f).length === 0);
    const galhos = filhos.filter((f) => filhosDe(f).length > 0);
    if (filhos.length === 0) return null;
    return (
      <div className={css.galho}>
        {folhas.length > 0 && (
          <div className={css.folhas}>
            {folhas.map((f) => (
              <No key={f} id={f} />
            ))}
          </div>
        )}
        {galhos.map((g) => (
          <div key={g} className={css.ramo}>
            <No id={g} />
            <Ramo id={g} />
          </div>
        ))}
      </div>
    );
  };

  const sel = aberto;
  const selCadeado = sel ? descricoesCadeados[sel] : undefined;
  const selConexoes = sel ? conexoesDe(sel) : [];

  return (
    <section className={css.lista} aria-label="Organograma dos sistemas da paróquia">
      {ZONAS.map((z) => (
        <div key={z.lado} className={`${css.orgZona} ${z.lado === "internet" ? css.orgNet : css.orgDentro}`}>
          <h2 className={css.orgTitulo}>{z.titulo}</h2>
          {z.ids.map((id) => (
            <div key={id} className={css.arvore}>
              <No id={id} raiz />
              <Ramo id={id} />
            </div>
          ))}
        </div>
      ))}
      <p className={css.listaIntro}>
        Toque num item para ver o que ele faz. Itens tracejados são projetos idealizados; 🔒 marca o ponto de contato com a internet.
      </p>

      {sel && (
        <aside className={css.folha} role="dialog" aria-label={nomeDe.get(sel)}>
          <button type="button" className={css.folhaFechar} onClick={() => setAberto(null)} aria-label="Fechar">
            ×
          </button>
          <h3 className={css.folhaTitulo}>{nomeDe.get(sel)}</h3>
          <p className={css.folhaTag}>
            {LADO_ROTULO[ladoDe(sel)]}
            {projetos.has(sel) ? " · projeto idealizado" : ""}
          </p>
          <p className={css.folhaTexto}>{descricoes[sel]}</p>
          {selCadeado && (
            <p className={css.folhaCadeado}>
              <strong>🔒 Ponto de contato.</strong> {selCadeado.serve} {selCadeado.protecao}
            </p>
          )}
          {selConexoes.length > 0 && (
            <>
              <h4 className={css.folhaSub}>Conexões</h4>
              {selConexoes.map((c) => (
                <p key={c.par} className={css.folhaTexto}>
                  <strong>↔ {c.outro}.</strong> {c.texto}
                </p>
              ))}
            </>
          )}
        </aside>
      )}
    </section>
  );
}
