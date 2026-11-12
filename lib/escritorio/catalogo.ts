// Só no servidor. Cadastro de produtos escolhidos na busca: antes de entrar no catálogo, o servidor
// visita cada oferta na loja (não confia no que veio do navegador) e tira dali nome, marca e EAN.
import { chaveOferta, visitar, type Leitura, type Oferta, type Produto } from "./fonte";
import { litrosDe, modelosDe, polegadasDe, semAcento } from "./busca";
import type { Banco } from "./rodada";

const CAMPOS = "id, nome, categoria, marca, modelo, destaques, ofertas, ean";
type ProdutoBanco = Produto & { ean: string | null };

function categoriaDe(nome: string) {
  const n = semAcento(nome);
  if (/\b(tv|televisor|televisao)\b/.test(n)) return "Televisor";
  if (/\b(geladeira|refrigerador)\b/.test(n)) return "Geladeira";
  const primeira = nome.trim().split(/\s+/)[0] ?? "Produto";
  return primeira.charAt(0).toUpperCase() + primeira.slice(1).toLowerCase();
}

function destaquesDe(nome: string, lojas: string[]) {
  const d: string[] = [];
  const pol = polegadasDe(nome);
  const lt = litrosDe(nome);
  if (pol) d.push(`${pol} polegadas`);
  if (lt) d.push(`${lt} litros`);
  const n = semAcento(nome);
  for (const [chave, texto] of [
    ["4k", "4K"],
    ["mini led", "Mini LED"],
    ["qled", "QLED"],
    ["oled", "OLED"],
    ["google tv", "Google TV"],
    ["frost free", "Frost Free"],
    ["inverter", "Inverter"],
    ["duplex", "Duas portas (duplex)"],
    ["french door", "French Door"],
  ] as const) {
    if (n.includes(chave) && !(chave === "oled" && n.includes("qled"))) d.push(texto);
  }
  d.push(`Acompanhado em ${lojas.length === 1 ? lojas[0] : `${lojas.length} lojas: ${lojas.join(", ")}`}`);
  return d;
}

const slug = (s: string) =>
  semAcento(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/**
 * Cadastra (ou reaproveita) o produto com estas ofertas. Devolve o produto pronto para contrato.
 * Reaproveita quando o EAN ou alguma das ofertas já existe no catálogo, e soma as ofertas novas.
 */
export async function cadastrarProduto(db: Banco, ofertas: Oferta[], usuarioId: string): Promise<Produto> {
  const leituras = await Promise.all(
    ofertas.map(async (o) => {
      try {
        return { o, l: await visitar(o) };
      } catch {
        return { o, l: null as Leitura | null };
      }
    }),
  );
  const boas = leituras.filter((x): x is { o: Oferta; l: Leitura } => !!x.l);
  if (!boas.length) throw new Error("Nenhuma das lojas respondeu agora. Tente de novo em alguns minutos.");
  const validas = boas.map((x) => x.o);
  const ean = boas.find((x) => x.l.ean)?.l.ean ?? null;
  const nome = (boas.find((x) => x.l.nome && x.o.tipo === "kabum") ?? boas.find((x) => x.l.nome))?.l.nome?.slice(0, 160) ?? "Produto";
  const marca = boas.find((x) => x.l.marca)?.l.marca?.slice(0, 60) ?? "";

  // já existe? pelo EAN ou por alguma das ofertas
  let existente: ProdutoBanco | null = null;
  if (ean) {
    const { data } = await db.from("produtos").select(CAMPOS).eq("ean", ean).maybeSingle();
    existente = data as ProdutoBanco | null;
  }
  for (const o of validas) {
    if (existente) break;
    const filtro = o.tipo === "kabum" ? { tipo: "kabum", codigo: o.codigo } : o.id ? { tipo: "vtex", base: o.base, id: o.id } : { tipo: "vtex", base: o.base, ref: o.ref };
    const { data } = await db.from("produtos").select(CAMPOS).filter("ofertas", "cs", JSON.stringify([filtro])).limit(1).maybeSingle();
    existente = data as ProdutoBanco | null;
  }

  if (existente) {
    const chaves = new Set(existente.ofertas.map(chaveOferta));
    const novas = validas.filter((o) => !chaves.has(chaveOferta(o)));
    if (novas.length || (!existente.ean && ean)) {
      const juntas = [...existente.ofertas, ...novas].slice(0, 12);
      const lojas = [...new Set(juntas.map((o) => o.loja))];
      const { data, error } = await db
        .from("produtos")
        .update({ ofertas: juntas, ...(existente.ean ? {} : { ean }), destaques: destaquesDe(existente.nome, lojas) })
        .eq("id", existente.id)
        .select(CAMPOS)
        .single();
      if (error) throw new Error(error.message);
      return data as Produto;
    }
    return existente;
  }

  const lojas = [...new Set(validas.map((o) => o.loja))];
  const modelo = modelosDe(nome)[0]?.toUpperCase() ?? (validas[0].tipo === "kabum" ? validas[0].codigo : validas[0].ref);
  const id = slug(ean ? `${marca || "produto"}-${modelo}-${ean}` : `${marca || "produto"}-${modelo}-${chaveOferta(validas[0])}`);
  const { data, error } = await db
    .from("produtos")
    .insert({
      id,
      nome,
      categoria: categoriaDe(nome),
      marca,
      modelo,
      destaques: destaquesDe(nome, lojas),
      ofertas: validas,
      ean,
      criado_por: usuarioId,
    })
    .select(CAMPOS)
    .single();
  if (error) {
    // outra pessoa cadastrou o mesmo produto no mesmo instante
    if (error.code === "23505") {
      const { data: d } = await db.from("produtos").select(CAMPOS).eq(ean ? "ean" : "id", ean ?? id).maybeSingle();
      if (d) return d as Produto;
    }
    throw new Error(error.message);
  }
  return data as Produto;
}
