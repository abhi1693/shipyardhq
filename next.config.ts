import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/sitemap-products-:index(\\d+).xml",
        destination: "/sitemap-products/:index",
      },
    ]
  },
  allowedDevOrigins: ["localhost", "192.168.1.101"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
}

export default nextConfig
