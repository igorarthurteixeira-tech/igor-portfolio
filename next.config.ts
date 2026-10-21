import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // acesso pela rede local durante o desenvolvimento (celular, outro PC)
  allowedDevOrigins: ["192.168.*.*", "100.*.*.*"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
