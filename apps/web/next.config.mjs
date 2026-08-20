import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(dir, "../.."),
  },
  transpilePackages: ["@veiculo/types", "recharts"],
  eslint: {
    dirs: ["src"],
  },
};

export default nextConfig;
