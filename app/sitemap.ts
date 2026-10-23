import type { MetadataRoute } from "next";
import { series } from "@/lib/series";
import { seriesDoBanco } from "@/lib/series-videos";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = [...series.map((s) => s.slug), ...(await seriesDoBanco()).map((s) => s.slug)];
  const baseUrl = "https://igorarthurdev.com.br";

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
    ...slugs.map((slug) => ({
      url: `${baseUrl}/vida-de-dono/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
