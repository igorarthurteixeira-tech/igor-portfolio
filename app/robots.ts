import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/etm", "/api/"],
    },
    sitemap: "https://igorarthurdev.com.br/sitemap.xml",
  };
}
