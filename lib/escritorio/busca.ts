// Busca de produtos nas lojas reais: o usuário digita o que procura ("televisor 65 polegadas",
// "geladeira 320 litros") e o servidor pergunta a cada loja aceita, filtra o que é de fato aquele
// produto (sem acessórios) e junta o mesmo modelo vendido em lojas diferentes numa linha só.
import { LOJAS_VTEX, chaveOferta, type Oferta } from "./fonte";

export type OfertaEncontrada = Oferta & { preco: number; vendedor: string; url: string };
export type ResultadoBusca = {
  chave: string;
  nome: string;
  marca: string;
  imagem: string | null;
  medida: string | null;
  /** false quando a medida é só próxima da pedida (ex.: 330 L numa busca de 320 L) */
  exato: boolean;
  menor: number;
  ofertas: OfertaEncontrada[];
};
export type RespostaBusca = { termo: string; resultados: ResultadoBusca[]; lojas: number; falhas: string[] };

const CABECALHOS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

export const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// ---------------------------------------------------------------------------
// Entender o pedido
// ---------------------------------------------------------------------------
type Unidade = "pol" | "L";
type Tipo = { nome: string; palavras: string[]; unidade: Unidade; termo: string };
const TIPOS: Tipo[] = [
  { nome: "Televisor", palavras: ["tv", "tvs", "televisor", "televisores", "televisao"], unidade: "pol", termo: "smart tv" },
  { nome: "Geladeira", palavras: ["geladeira", "geladeiras", "refrigerador", "refrigeradores"], unidade: "L", termo: "geladeira" },
];
const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "com", "para", "e", "a", "o", "um", "uma", "smart", "polegadas", "pol", "litros", "lts", "l"]);
/** Primeira palavra de nomes de acessórios e peças: não são o produto procurado. */
const ACESSORIOS = new Set(
  "home suporte rack painel capa controle cabo kit antena conversor estante pe base filtro porta pote potes organizador borracha gaxeta prateleira gaveta puxador lampada compressor motoventilador armario tampa protetor pelicula adaptador bandeja termostato placa sensor peca resistencia carregador fonte bateria mesa ventilador timer dobradica refil jogo conjunto".split(
    " ",
  ),
);

export type Pedido = { termo: string; tipo: Tipo | null; palavras: string[]; medida: { valor: number; unidade: Unidade | null; texto: string } | null };

export function entender(termo: string): Pedido {
  const t = semAcento(termo).replace(/[^\w"”\s.,]/g, " ").replace(/\s+/g, " ").trim();
  const tipo = TIPOS.find((x) => t.split(" ").some((p) => x.palavras.includes(p))) ?? null;
  const m = t.match(/(\d{1,4}(?:[.,]\d)?)\s*("|”|''|polegadas\b|pol\b|litros\b|lts?\b|l\b)?/);
  let medida: Pedido["medida"] = null;
  if (m) {
    const valor = Number(m[1].replace(",", "."));
    const u = m[2] ? (/^("|”|''|pol)/.test(m[2]) ? "pol" : "L") : (tipo?.unidade ?? null);
    medida = { valor, unidade: u, texto: u === "pol" ? `${valor} polegadas` : u === "L" ? `${valor} litros` : String(valor) };
  }
  const palavras = t
    .split(" ")
    .filter((p) => p && !/^\d/.test(p) && !PALAVRAS_VAZIAS.has(p) && !(tipo && tipo.palavras.includes(p)));
  return { termo: t, tipo, palavras, medida };
}

// ---------------------------------------------------------------------------
// Ler o nome de um produto
// ---------------------------------------------------------------------------
export function polegadasDe(nome: string): number | null {
  const n = semAcento(nome).replace(/[“”″]|´´|''/g, '"');
  const m = n.match(/(?<![\w.,])(\d{2,3}(?:[.,]\d)?)\s*(?:"|pol\b|polegadas\b)/) ?? n.match(/(?:^|\s)(?:tv|televisor)(?:\s+\w+)?\s+(\d{2,3})(?![\w.,])/);
  return m ? Number(m[1].replace(",", ".")) : null;
}
export function litrosDe(nome: string): number | null {
  const m = semAcento(nome).match(/(?<![\w.,])(\d{2,4})\s*(?:l|lts?|litros)\b/);
  return m ? Number(m[1]) : null;
}

/** Códigos de modelo no nome ("65C6K", "BRM51MB", "U8600F"): servem para reconhecer o mesmo produto em lojas diferentes. */
export function modelosDe(nome: string): string[] {
  return semAcento(nome)
    .split(/[\s,()|+]+/)
    .map((w) => w.replace(/^[-/]+|[-/]+$/g, ""))
    .filter((w) => {
      if (w.length < 5 || w.length > 22) return false;
      const dig = (w.match(/\d/g) ?? []).length;
      const let_ = (w.match(/[a-z]/g) ?? []).length;
      if (dig < 2 || let_ < 2) return false;
      if (/^hdr\d/.test(w) || /^(hdmi|usb|ddr|wifi|wi-fi|dvb|isdb)/.test(w)) return false;
      if (/^\d+(hz|gb|tb|mp|w|v|l|lts|mah|pol|polegadas|litros|kg|cm|mm)$/.test(w)) return false;
      return true;
    });
}

function eOProduto(nome: string, p: Pedido) {
  const n = semAcento(nome).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const ps = n.split(" ");
  if (ACESSORIOS.has(ps[0])) return false;
  if (p.tipo) {
    // "Rack para TV", "Home p/ TV 65": é para o produto, não o produto
    if (p.tipo.palavras.some((w) => new RegExp(`\\b(para|p)\\s+(a\\s+|o\\s+)?${w}\\b`).test(n))) return false;
    // o tipo precisa aparecer logo no começo ("Smart TV ...", "Geladeira ...", "Refrigerador ...")
    if (!ps.slice(0, 3).some((w) => p.tipo!.palavras.includes(w))) return false;
  }
  // as outras palavras do pedido (marca, "frost", "inverter"...) precisam estar no nome
  return p.palavras.every((w) => ps.some((x) => x.startsWith(w)));
}

/** Confere a medida. Televisor: exata. Litros: até 10% de diferença (marcada como "próxima"). */
function conferirMedida(nome: string, p: Pedido): { ok: boolean; exato: boolean; medida: string | null } {
  const pol = polegadasDe(nome);
  const lt = litrosDe(nome);
  const medida = p.tipo?.unidade === "L" || p.medida?.unidade === "L" ? (lt ? `${lt} L` : null) : pol ? `${pol}"` : lt ? `${lt} L` : null;
  if (!p.medida) return { ok: true, exato: true, medida };
  const { valor, unidade } = p.medida;
  if (unidade === "pol") return { ok: pol !== null && Math.abs(pol - valor) < 0.6, exato: true, medida };
  if (unidade === "L") {
    if (lt === null) return { ok: false, exato: false, medida };
    const dif = Math.abs(lt - valor) / valor;
    return { ok: dif <= 0.1, exato: dif <= 0.02, medida };
  }
  // número sem unidade conhecida: precisa aparecer no nome como número solto
  return { ok: new RegExp(`(?<![\\w.,])${valor}(?![\\d.,])`).test(semAcento(nome)), exato: true, medida };
}

// ---------------------------------------------------------------------------
// Lojas
// ---------------------------------------------------------------------------
type Achado = { oferta: OfertaEncontrada; nome: string; marca: string; imagem: string | null; ean: string | null };

async function buscarKabum(p: Pedido): Promise<Achado[]> {
  const slug = (p.tipo ? `${p.tipo.termo} ${p.termo.split(" ").filter((w) => !p.tipo!.palavras.includes(w)).join(" ")}` : p.termo)
    .replace(/["”.,]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
  const r = await fetch(`https://www.kabum.com.br/busca/${encodeURIComponent(slug)}`, {
    headers: { ...CABECALHOS, Accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`KaBuM respondeu ${r.status}`);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("KaBuM sem dados de busca");
  type Pagina = { catalogServer?: { data?: Record<string, unknown>[] } };
  const bruto = (JSON.parse(m[1]) as { props?: { pageProps?: { data?: Pagina | string } } }).props?.pageProps?.data;
  // na busca vem como objeto; quando a KaBuM redireciona para a página da categoria, vem como texto JSON
  const pagina = (typeof bruto === "string" ? JSON.parse(bruto) : bruto) as Pagina | undefined;
  const lista = pagina?.catalogServer?.data ?? [];
  return lista.flatMap((x) => {
    const preco = Number(x.priceMarketplace) || Number(x.price);
    if (!x.available || !(preco > 0)) return [];
    const codigo = String(x.code);
    const fab = x.manufacturer as { name?: string } | undefined;
    return [
      {
        oferta: {
          loja: "KaBuM",
          tipo: "kabum" as const,
          codigo,
          preco,
          vendedor: String(x.sellerName ?? "KaBuM"),
          url: `https://www.kabum.com.br/produto/${codigo}`,
        },
        nome: String(x.name ?? ""),
        marca: fab?.name ?? "",
        imagem: typeof x.thumbnail === "string" ? x.thumbnail : typeof x.image === "string" ? x.image : null,
        ean: null,
      },
    ];
  });
}

type ProdutoVtex = {
  productId: string;
  productName: string;
  brand: string;
  productReference: string;
  link: string;
  items: { ean?: string; images?: { imageUrl: string }[]; sellers: { sellerName: string; commertialOffer: { Price: number; AvailableQuantity: number } }[] }[];
};

async function buscarVtex(loja: string, base: string, p: Pedido): Promise<Achado[]> {
  const termo = p.tipo ? `${p.tipo.termo} ${p.termo.split(" ").filter((w) => !p.tipo!.palavras.includes(w)).join(" ")}` : p.termo;
  const r = await fetch(`${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termo.trim())}&_from=0&_to=49`, {
    headers: { ...CABECALHOS, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!r.ok && r.status !== 206) throw new Error(`${loja} respondeu ${r.status}`);
  const lista = (await r.json()) as ProdutoVtex[];
  return lista.flatMap((x) => {
    const item = x.items?.[0];
    const vend = item?.sellers?.[0];
    const preco = vend?.commertialOffer?.Price ?? 0;
    if (!item || !vend || !(preco > 0) || !(vend.commertialOffer.AvailableQuantity > 0) || !x.productReference) return [];
    return [
      {
        oferta: { loja, tipo: "vtex" as const, base, ref: x.productReference, id: String(x.productId), preco, vendedor: vend.sellerName || loja, url: x.link },
        nome: x.productName,
        marca: x.brand ?? "",
        imagem: item.images?.[0]?.imageUrl ?? null,
        ean: item.ean || null,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Juntar o mesmo modelo de lojas diferentes
// ---------------------------------------------------------------------------
function agrupar(achados: (Achado & { exato: boolean; medida: string | null })[]): ResultadoBusca[] {
  const pai = achados.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const unir = (a: number, b: number) => {
    pai[raiz(a)] = raiz(b);
  };
  const modelos = achados.map((a) => modelosDe(a.nome));
  for (let i = 0; i < achados.length; i++) {
    for (let j = i + 1; j < achados.length; j++) {
      const a = achados[i];
      const b = achados[j];
      if (a.ean && b.ean && a.ean === b.ean) {
        unir(i, j);
        continue;
      }
      if (a.medida !== b.medida) continue;
      const mesmo = modelos[i].some((x) => modelos[j].some((y) => x === y || (x.length >= 6 && y.includes(x)) || (y.length >= 6 && x.includes(y))));
      if (mesmo) unir(i, j);
    }
  }
  const grupos = new Map<number, typeof achados>();
  achados.forEach((a, i) => grupos.set(raiz(i), [...(grupos.get(raiz(i)) ?? []), a]));
  return [...grupos.values()].map((g) => {
    const vistos = new Set<string>();
    const ofertas = g
      .map((a) => a.oferta)
      .filter((o) => {
        const k = chaveOferta(o);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .sort((a, b) => a.preco - b.preco);
    // nome mais descritivo: o mais curto entre os que trazem marca, sem exagero
    const nome = [...g].sort((a, b) => a.nome.length - b.nome.length).find((a) => a.nome.length >= 20)?.nome ?? g[0].nome;
    const ean = g.find((a) => a.ean)?.ean;
    return {
      chave: ean ? `ean:${ean}` : chaveOferta(ofertas[0]),
      nome,
      marca: g.find((a) => a.marca)?.marca ?? "",
      imagem: g.find((a) => a.imagem)?.imagem ?? null,
      medida: g[0].medida,
      exato: g.some((a) => a.exato),
      menor: ofertas[0].preco,
      ofertas,
    };
  });
}

// ---------------------------------------------------------------------------
const cache = new Map<string, { quando: number; resposta: RespostaBusca }>();

/** Pergunta a todas as lojas aceitas ao mesmo tempo e devolve os produtos encontrados. */
export async function buscarNasLojas(termo: string): Promise<RespostaBusca> {
  const pedido = entender(termo);
  const k = pedido.termo;
  const guardado = cache.get(k);
  if (guardado && Date.now() - guardado.quando < 10 * 60_000) return guardado.resposta;

  const consultas = [
    { loja: "KaBuM", fazer: () => buscarKabum(pedido) },
    ...LOJAS_VTEX.map((l) => ({ loja: l.loja, fazer: () => buscarVtex(l.loja, l.base, pedido) })),
  ];
  const respostas = await Promise.allSettled(consultas.map((c) => c.fazer()));
  const falhas: string[] = [];
  const achados: (Achado & { exato: boolean; medida: string | null })[] = [];
  respostas.forEach((r, i) => {
    if (r.status === "rejected") {
      falhas.push(consultas[i].loja);
      return;
    }
    for (const a of r.value) {
      if (!eOProduto(a.nome, pedido)) continue;
      const m = conferirMedida(a.nome, pedido);
      if (m.ok) achados.push({ ...a, exato: m.exato, medida: m.medida });
    }
  });
  const resultados = agrupar(achados)
    .sort((a, b) => Number(b.exato) - Number(a.exato) || a.menor - b.menor)
    .slice(0, 40);
  const resposta = { termo: pedido.termo, resultados, lojas: consultas.length - falhas.length, falhas };
  if (cache.size > 200) cache.clear();
  cache.set(k, { quando: Date.now(), resposta });
  return resposta;
}
