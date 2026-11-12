// Fonte de preços REAIS do "Meu escritório de compras".
// Cada produto tem uma ou mais ofertas em lojas reais. O pesquisador visita cada oferta a cada rodada.
// Lojas aceitas: KaBuM (página do produto, dados schema.org) e lojas da plataforma VTEX (API pública
// de catálogo). Os produtos ficam no banco (tabela "produtos"): o próprio usuário os encontra pela busca.

/** Lojas VTEX que deixam ler catálogo e busca. Só estas são aceitas numa oferta. */
export const LOJAS_VTEX = [
  { loja: "Consul", base: "https://www.consul.com.br" },
  { loja: "Brastemp", base: "https://www.brastemp.com.br" },
  { loja: "Midea", base: "https://www.midea.com.br" },
  { loja: "Philco", base: "https://www.philco.com.br" },
  { loja: "Britânia", base: "https://www.britania.com.br" },
  { loja: "Mondial", base: "https://www.mondial.com.br" },
  { loja: "WebContinental", base: "https://www.webcontinental.com.br" },
  { loja: "ibyte", base: "https://www.ibyte.com.br" },
  { loja: "Americanas", base: "https://www.americanas.com.br" },
] as const;

type VendedorVtex = { sellerName: string; commertialOffer: { Price: number; AvailableQuantity: number } };

/** Em marketplace (ex.: Americanas) o mesmo produto tem vários vendedores: vale o mais barato com estoque. */
export function melhorVendedorVtex(vendedores: VendedorVtex[] | undefined): VendedorVtex | undefined {
  const lista = vendedores ?? [];
  const comEstoque = lista.filter((v) => v.commertialOffer?.AvailableQuantity > 0 && v.commertialOffer?.Price > 0);
  return comEstoque.sort((a, b) => a.commertialOffer.Price - b.commertialOffer.Price)[0] ?? lista[0];
}

export type Oferta =
  | { loja: string; tipo: "kabum"; codigo: string }
  | { loja: string; tipo: "vtex"; base: string; ref: string; /** código interno do produto na loja (mais confiável que a ref) */ id?: string };

export type Produto = {
  id: string;
  nome: string;
  categoria: string;
  marca: string;
  modelo: string;
  destaques: string[];
  ofertas: Oferta[];
};

/** Chave única de uma oferta (para não repetir a mesma página no mesmo produto). */
export const chaveOferta = (o: Oferta) => (o.tipo === "kabum" ? `kabum:${o.codigo}` : `vtex:${o.base}:${o.id ?? o.ref}`);

/** Confere uma oferta vinda do navegador: só lojas conhecidas e códigos com formato plausível. */
export function ofertaValida(o: unknown): Oferta | null {
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;
  if (x.tipo === "kabum" && typeof x.codigo === "string" && /^\d{1,12}$/.test(x.codigo)) {
    return { loja: "KaBuM", tipo: "kabum", codigo: x.codigo };
  }
  if (x.tipo === "vtex" && typeof x.ref === "string" && /^[\w.\-/ ]{1,80}$/.test(x.ref)) {
    const loja = LOJAS_VTEX.find((l) => l.base === x.base);
    const id = typeof x.id === "string" && /^\d{1,12}$/.test(x.id) ? x.id : undefined;
    if (loja) return { loja: loja.loja, tipo: "vtex", base: loja.base, ref: x.ref, ...(id ? { id } : {}) };
  }
  return null;
}

/** O que o pesquisador encontrou numa oferta. */
export type Leitura = {
  loja: string;
  vendedor: string;
  preco: number | null;
  disponivel: boolean;
  url: string;
  imagem: string | null;
  coletadoEm: string;
  /** Dados do produto como a loja descreve (usados ao cadastrar um produto novo). */
  nome?: string;
  marca?: string;
  ean?: string | null;
};

export const FONTE = { nome: "Lojas reais (KaBuM e lojas VTEX)", simulada: false };

const CABECALHOS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

async function baixar(url: string, aceitar: string) {
  const r = await fetch(url, { headers: { ...CABECALHOS, Accept: aceitar }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`respondeu ${r.status}`);
  return r;
}

async function lerKabum(codigo: string): Promise<Omit<Leitura, "loja" | "coletadoEm">> {
  const url = `https://www.kabum.com.br/produto/${codigo}`;
  const html = await (await baixar(url, "text/html")).text();
  let produto: Record<string, unknown> | null = null;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const o of Array.isArray(j) ? j : [j]) if (o?.["@type"] === "Product") produto = o;
    } catch {}
  }
  if (!produto) throw new Error("página sem dados do produto");
  const oferta = (Array.isArray(produto.offers) ? produto.offers[0] : produto.offers) as Record<string, unknown> | undefined;
  const preco = Number(oferta?.price);
  const vendedor = html.match(/"sellerName":"([^"]+)"/)?.[1] ?? "KaBuM";
  const imagem = Array.isArray(produto.image) ? String(produto.image[0]) : produto.image ? String(produto.image) : null;
  const marca = produto.brand as { name?: string } | string | undefined;
  return {
    nome: typeof produto.name === "string" ? produto.name : undefined,
    marca: typeof marca === "string" ? marca : marca?.name,
    ean: typeof produto.gtin13 === "string" ? produto.gtin13 : null,
    vendedor,
    preco: Number.isFinite(preco) && preco > 0 ? preco : null,
    disponivel: String(oferta?.availability ?? "").includes("InStock"),
    url: String(oferta?.url ?? url),
    imagem,
  };
}

async function lerVtex(base: string, ref: string, id?: string): Promise<Omit<Leitura, "loja" | "coletadoEm">> {
  const filtro = id ? `productId:${id}` : `alternateIds_RefId:${encodeURIComponent(ref)}`;
  const r = await baixar(`${base}/api/catalog_system/pub/products/search?fq=${filtro}`, "application/json");
  const lista = (await r.json()) as {
    productReference: string;
    productName: string;
    brand: string;
    link: string;
    items: { ean?: string; images?: { imageUrl: string }[]; sellers: { sellerName: string; commertialOffer: { Price: number; AvailableQuantity: number } }[] }[];
  }[];
  const p = id ? lista[0] : lista.find((x) => x.productReference === ref);
  if (!p) throw new Error("produto não encontrado na loja");
  const item = p.items[0];
  const vendedor = melhorVendedorVtex(item.sellers);
  const preco = vendedor?.commertialOffer?.Price;
  return {
    nome: p.productName,
    marca: p.brand,
    ean: item.ean || null,
    vendedor: vendedor?.sellerName ?? base,
    preco: preco && preco > 0 ? preco : null,
    disponivel: (vendedor?.commertialOffer?.AvailableQuantity ?? 0) > 0,
    url: p.link,
    imagem: item.images?.[0]?.imageUrl ?? null,
  };
}

/** Visita uma oferta numa loja real. Lança erro se a loja não responder. */
export async function visitar(o: Oferta): Promise<Leitura> {
  const lido = o.tipo === "kabum" ? await lerKabum(o.codigo) : await lerVtex(o.base, o.ref, o.id);
  return { ...lido, loja: o.loja, coletadoEm: new Date().toISOString() };
}
