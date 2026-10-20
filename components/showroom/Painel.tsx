"use client";

import { useState } from "react";
import Link from "next/link";
import { carrocerias, type Carro, type Carroceria } from "@/lib/carros";
import {
  apagarInteresse,
  brl,
  kmTxt,
  marcarVendido,
  removerCarro,
  restaurarDemo,
  salvarCarro,
  useCarros,
  useInteressados,
} from "@/lib/showroom-store";
import SemFoto from "./SemFoto";

const CAMBIOS = ["Manual", "Automático"] as const;
const COMBUSTIVEIS = ["Flex", "Gasolina", "Diesel", "Elétrico", "Híbrido"] as const;

type Form = {
  id: string;
  marca: string;
  modelo: string;
  versao: string;
  ano: string;
  km: string;
  preco: string;
  cambio: Carro["cambio"];
  combustivel: Carro["combustivel"];
  carroceria: Carroceria;
  corNome: string;
  corHex: string;
  cidade: string;
  opcionais: string;
  descricao: string;
  destaque: boolean;
  fotos: string[];
};

const vazio: Form = {
  id: "", marca: "", modelo: "", versao: "", ano: String(new Date().getFullYear()), km: "0", preco: "",
  cambio: "Automático", combustivel: "Flex", carroceria: "hatch", corNome: "Prata", corHex: "#aab2bd",
  cidade: "Cidade Exemplo", opcionais: "", descricao: "", destaque: false, fotos: [],
};

const doCarro = (c: Carro): Form => ({
  id: c.id, marca: c.marca, modelo: c.modelo, versao: c.versao, ano: String(c.ano), km: String(c.km),
  preco: String(c.preco), cambio: c.cambio, combustivel: c.combustivel, carroceria: c.carroceria,
  corNome: c.cor.nome, corHex: c.cor.hex, cidade: c.cidade, opcionais: c.opcionais.join(", "),
  descricao: c.descricao, destaque: !!c.destaque, fotos: c.fotos ?? [],
});

/** Reduz a foto enviada (máx. 900 px, JPEG) para caber no armazenamento do navegador. */
function reduzir(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * esc);
      c.height = Math.round(img.height * esc);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida")); };
    img.src = url;
  });
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Painel() {
  const carros = useCarros();
  const interessados = useInteressados();
  const [aba, setAba] = useState<"estoque" | "interessados">("estoque");
  const [form, setForm] = useState<Form | null>(null);
  const [erro, setErro] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const campo = "field";
  const rotulo = "mb-1.5 block text-sm font-semibold text-fg";
  const nomeDoCarro = (id: string) => {
    const c = carros.find((x) => x.id === id);
    return c ? `${c.marca} ${c.modelo}` : "Veículo removido";
  };

  const total = carros.length;
  const disponiveis = carros.filter((c) => !c.vendido).length;
  const valor = carros.filter((c) => !c.vendido).reduce((s, c) => s + c.preco, 0);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function fotos(lista: FileList | null) {
    if (!lista || !form) return;
    setEnviandoFoto(true);
    try {
      const novas = await Promise.all([...lista].slice(0, 6).map(reduzir));
      setForm((f) => (f ? { ...f, fotos: [...f.fotos, ...novas].slice(0, 6) } : f));
    } catch {
      setErro("Não foi possível ler uma das imagens.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const preco = Number(form.preco.replace(/\D/g, ""));
    const ano = Number(form.ano);
    const km = Number(form.km.replace(/\D/g, "")) || 0;
    if (!form.marca.trim() || !form.modelo.trim()) return setErro("Informe marca e modelo.");
    if (!preco || preco < 1000) return setErro("Informe um preço válido.");
    if (!ano || ano < 1980 || ano > 2100) return setErro("Informe um ano válido.");
    const carro: Carro = {
      id: form.id || `${slug(form.marca + " " + form.modelo)}-${crypto.randomUUID().slice(0, 6)}`,
      marca: form.marca.trim(), modelo: form.modelo.trim(), versao: form.versao.trim() || "—",
      ano, km, preco, cambio: form.cambio, combustivel: form.combustivel, carroceria: form.carroceria,
      cor: { nome: form.corNome.trim() || "Sem nome", hex: form.corHex },
      cidade: form.cidade.trim() || "Cidade Exemplo",
      opcionais: form.opcionais.split(",").map((o) => o.trim()).filter(Boolean),
      descricao: form.descricao.trim() || "Sem descrição.",
      destaque: form.destaque,
      fotos: form.fotos.length ? form.fotos : undefined,
      vendido: carros.find((c) => c.id === form.id)?.vendido,
    };
    salvarCarro(carro);
    setForm(null);
    setErro("");
  }

  const aviso = (
    <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Painel de demonstração.</strong> Tudo o que você cadastra, edita ou apaga fica salvo apenas
      neste navegador e não é enviado a nenhum servidor.
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Vértice Motors</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Painel de cadastro</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/showroom#estoque" className="btn-outline px-4! py-2!">Ver o estoque</Link>
          <button
            onClick={() => { if (confirm("Restaurar os dados de demonstração? Suas alterações serão perdidas.")) restaurarDemo(); }}
            className="btn-outline px-4! py-2!"
          >
            Restaurar demonstração
          </button>
        </div>
      </div>

      {aviso}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[["Veículos", String(total)], ["Disponíveis", String(disponiveis)], ["Valor em estoque", brl(valor)]].map(([t, v]) => (
          <div key={t} className="card p-5">
            <p className="text-sm text-muted">{t}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex gap-1" role="tablist">
          {([["estoque", "Estoque"], ["interessados", `Interessados (${interessados.length})`]] as const).map(([id, nome]) => (
            <button
              key={id}
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${aba === id ? "bg-accent-strong/10 text-accent-strong" : "text-slate-500 hover:bg-white hover:text-fg"}`}
            >
              {nome}
            </button>
          ))}
        </div>
        {aba === "estoque" && !form && (
          <button onClick={() => { setForm(vazio); setErro(""); }} className="btn-dark px-5! py-2.5!">+ Novo veículo</button>
        )}
      </div>

      {form && (
        <form onSubmit={enviar} className="card mb-8 space-y-5 p-6">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{form.id ? "Editar veículo" : "Novo veículo"}</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={rotulo} htmlFor="f-marca">Marca</label><input id="f-marca" className={campo} value={form.marca} onChange={(e) => set("marca", e.target.value)} /></div>
            <div><label className={rotulo} htmlFor="f-modelo">Modelo</label><input id="f-modelo" className={campo} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} /></div>
            <div><label className={rotulo} htmlFor="f-versao">Versão</label><input id="f-versao" className={campo} value={form.versao} onChange={(e) => set("versao", e.target.value)} /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div><label className={rotulo} htmlFor="f-ano">Ano</label><input id="f-ano" inputMode="numeric" className={campo} value={form.ano} onChange={(e) => set("ano", e.target.value)} /></div>
            <div><label className={rotulo} htmlFor="f-km">Quilometragem</label><input id="f-km" inputMode="numeric" className={campo} value={form.km} onChange={(e) => set("km", e.target.value)} /></div>
            <div><label className={rotulo} htmlFor="f-preco">Preço (R$)</label><input id="f-preco" inputMode="numeric" className={campo} value={form.preco} onChange={(e) => set("preco", e.target.value)} placeholder="89900" /></div>
            <div><label className={rotulo} htmlFor="f-cidade">Cidade</label><input id="f-cidade" className={campo} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div><label className={rotulo} htmlFor="f-cambio">Câmbio</label><select id="f-cambio" className={campo} value={form.cambio} onChange={(e) => set("cambio", e.target.value as Form["cambio"])}>{CAMBIOS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={rotulo} htmlFor="f-comb">Combustível</label><select id="f-comb" className={campo} value={form.combustivel} onChange={(e) => set("combustivel", e.target.value as Form["combustivel"])}>{COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={rotulo} htmlFor="f-tipo">Carroceria</label><select id="f-tipo" className={campo} value={form.carroceria} onChange={(e) => set("carroceria", e.target.value as Carroceria)}>{carrocerias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div>
              <label className={rotulo} htmlFor="f-cor">Cor</label>
              <div className="flex gap-2">
                <input id="f-cor" type="color" value={form.corHex} onChange={(e) => set("corHex", e.target.value)} className="h-[46px] w-14 cursor-pointer rounded-xl border border-line bg-white p-1" aria-label="Escolher cor" />
                <input className={campo} value={form.corNome} onChange={(e) => set("corNome", e.target.value)} aria-label="Nome da cor" />
              </div>
            </div>
          </div>

          <div><label className={rotulo} htmlFor="f-opc">Opcionais (separados por vírgula)</label><input id="f-opc" className={campo} value={form.opcionais} onChange={(e) => set("opcionais", e.target.value)} placeholder="Ar-condicionado, Direção elétrica, Câmera de ré" /></div>
          <div><label className={rotulo} htmlFor="f-desc">Descrição</label><textarea id="f-desc" rows={3} className={campo} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} /></div>

          <div>
            <p className={rotulo}>Fotos (até 6)</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.fotos.map((f, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt={`Foto ${i + 1}`} className="h-20 w-28 rounded-lg border border-line object-cover" />
                  <button type="button" onClick={() => set("fotos", form.fotos.filter((_, j) => j !== i))} aria-label={`Remover foto ${i + 1}`} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">×</button>
                </div>
              ))}
              {form.fotos.length === 0 && (
                <div className="rounded-lg border border-dashed border-line bg-white p-1">
                  <SemFoto className="h-20 w-28 rounded-lg [&_span]:hidden [&_svg]:h-7 [&_svg]:w-7" />
                </div>
              )}
              <label className="btn-outline cursor-pointer px-4! py-2!">
                {enviandoFoto ? "Processando..." : "Enviar fotos"}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { fotos(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">Sem fotos, a vitrine mostra &ldquo;Foto em breve&rdquo;. Use só imagens que você tem direito de usar.</p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-fg">
            <input type="checkbox" checked={form.destaque} onChange={(e) => set("destaque", e.target.checked)} className="h-4 w-4 accent-[var(--color-accent-strong)]" />
            Mostrar em destaque
          </label>

          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="flex gap-3">
            <button className="btn-dark">Salvar veículo</button>
            <button type="button" onClick={() => { setForm(null); setErro(""); }} className="btn-outline">Cancelar</button>
          </div>
        </form>
      )}

      {aba === "estoque" ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-3">Veículo</th><th className="px-3 py-3">Ano</th><th className="px-3 py-3">Km</th><th className="px-3 py-3">Preço</th><th className="px-3 py-3">Situação</th><th className="px-5 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {carros.map((c) => (
                  <tr key={c.id} className="align-middle">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 shrink-0 rounded-lg bg-slate-100 p-1">
                          {c.fotos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.fotos[0]} alt="" className="aspect-[16/10] w-full rounded object-cover" />
                          ) : (
                            <SemFoto className="aspect-[16/10] w-full rounded text-[0px] [&_svg]:h-5 [&_svg]:w-5" />
                          )}
                        </div>
                        <div>
                          <Link href={`/showroom/${c.id}`} className="font-semibold text-fg hover:text-accent-strong">{c.marca} {c.modelo}</Link>
                          <p className="text-xs text-slate-500">{c.versao}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{c.ano}</td>
                    <td className="px-3 py-3">{kmTxt(c.km)}</td>
                    <td className="px-3 py-3 font-semibold text-fg">{brl(c.preco)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.vendido ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{c.vendido ? "Vendido" : "Disponível"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2 text-xs font-semibold">
                        <button onClick={() => { setForm(doCarro(c)); setErro(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-line bg-white px-3 py-1.5 transition hover:bg-slate-50">Editar</button>
                        <button onClick={() => marcarVendido(c.id, !c.vendido)} className="rounded-lg border border-line bg-white px-3 py-1.5 transition hover:bg-slate-50">{c.vendido ? "Reabrir" : "Marcar vendido"}</button>
                        <button onClick={() => { if (confirm(`Remover ${c.marca} ${c.modelo}?`)) removerCarro(c.id); }} className="rounded-lg border border-line bg-white px-3 py-1.5 text-red-700 transition hover:bg-red-50">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {carros.length === 0 && (<tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Nenhum veículo. Clique em “Novo veículo” ou restaure a demonstração.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {interessados.length === 0 && (
            <div className="card p-10 text-center text-slate-500">Ninguém registrou interesse ainda. Abra um carro na vitrine e envie o formulário.</div>
          )}
          {interessados.map((i) => (
            <div key={i.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-fg">{i.nome} <span className="font-normal text-muted">· {i.telefone}</span></p>
                <p className="text-sm text-accent-strong">{nomeDoCarro(i.carroId)}</p>
                <p className="mt-2 text-sm text-slate-700">{i.mensagem}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(i.em).toLocaleString("pt-BR")}</p>
              </div>
              <button onClick={() => apagarInteresse(i.id)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50">Apagar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
