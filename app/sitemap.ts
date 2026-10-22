import type { MetadataRoute } from "next";
import { series } from "@/lib/series";

export default function sitemap(): MetadataRoute.Sitemap {
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
    ...series.map((s) => ({
      url: `${baseUrl}/vida-de-dono/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
