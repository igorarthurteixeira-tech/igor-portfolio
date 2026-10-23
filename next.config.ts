import path from "path";
import type { NextConfig } from "next";

// Imagens das séries criadas pelo painel ficam num bucket público do Supabase.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // acesso pela rede local durante o desenvolvimento (celular, outro PC)
  allowedDevOrigins: ["192.168.*.*", "100.*.*.*"],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
