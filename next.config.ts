import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/sitemap-products-:index(\\d+).xml",
        destination: "/sitemap-products/:index",
      },
      {
        source: "/sitemap-tags-:index(\\d+).xml",
        destination: "/sitemap-tags/:index",
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
  poweredByHeader: false,
}

export default nextConfig
