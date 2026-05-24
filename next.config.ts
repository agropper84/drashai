import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ioredis'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
