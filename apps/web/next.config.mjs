import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(dir, "../.."),
  },
    transpilePackages: ["@veiculo/types", "recharts", "@wavoip/wavoip-api"],
  eslint: {
    dirs: ["src"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://api:3001";
    return [
      // Tampermonkey espera .user.js; a rota App Router é /capturar-shopcar.
      {
        source: "/capturar-shopcar.user.js",
        destination: "/capturar-shopcar",
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
