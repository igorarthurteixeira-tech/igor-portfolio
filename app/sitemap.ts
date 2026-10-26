import type { MetadataRoute } from "next";
import { series } from "@/lib/series";
import { seriesDoBanco } from "@/lib/series-videos";
import { conteudos } from "@/lib/conteudos";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = [...series.map((s) => s.slug), ...(await seriesDoBanco()).map((s) => s.slug)];
  const baseUrl = "https://igorarthurdev.com.br";
  const posts = await conteudos();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/projetos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...(posts.length > 0
      ? [{ url: `${baseUrl}/conteudos`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    ...posts.map((c) => ({
      url: `${baseUrl}/conteudos/${c.slug}`,
      lastModified: new Date(c.publicadoEm),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...slugs.map((slug) => ({
      url: `${baseUrl}/vida-de-dono/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
