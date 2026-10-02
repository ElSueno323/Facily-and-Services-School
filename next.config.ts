import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  experimental: {
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
}

export default nextConfig
