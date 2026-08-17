/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@veiculo/types"],
  eslint: {
    dirs: ["src"],
  },
};

export default nextConfig;
