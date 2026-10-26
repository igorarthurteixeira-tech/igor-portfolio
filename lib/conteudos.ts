import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Detalhe, Publicacao } from "@/lib/publicacoes";

/** Um carrossel publicado, como aparece na página Conteúdos do site. */
export type Conteudo = {
  slug: string;
  titulo: string;
  legenda: string;
  imagens: string[];
  publicadoEm: string;
  instagram: string | null;
};

/**
 * Carrosséis marcados para aparecer no site. Só entram os que já foram ao ar no Instagram:
 * a página nasce junto com a postagem. Se a migration ainda não foi aplicada, devolve vazio.
 */
export async function conteudos(): Promise<Conteudo[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("publicacoes")
    .select("*")
    .eq("tipo", "carrossel")
    .eq("no_site", true)
    .not("slug", "is", null);
  if (error) return [];

  const itens: Conteudo[] = [];
  for (const p of (data ?? []) as Publicacao[]) {
    if (p.status_redes.instagram !== "publicado" || !p.slug || (p.imagens?.length ?? 0) < 2) continue;
    const det = (p.detalhes_redes.instagram ?? {}) as Detalhe;
    itens.push({
      slug: p.slug,
      titulo: p.titulo,
      legenda: p.textos.instagram?.legenda ?? "",
      imagens: p.imagens ?? [],
      publicadoEm: det.publicado_em ?? p.criado_em,
      instagram: det.permalink ?? null,
    });
  }
  return itens.sort((a, b) => Date.parse(b.publicadoEm) - Date.parse(a.publicadoEm));
}

export async function conteudoPorSlug(slug: string) {
  return (await conteudos()).find((c) => c.slug === slug) ?? null;
}

/** Primeiro parágrafo da legenda, sem hashtags, para resumo e descrição da página. */
export function resumoDaLegenda(legenda: string, max = 160) {
  const limpo = legenda
    .split("\n")
    .filter((l) => l.trim() && !/^\s*(#\S+\s*)+$/.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo;
}

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
