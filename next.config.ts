import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/rank-in-public",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/products/:slug/updates",
        destination: "/products/:slug",
        permanent: true,
      },
      // Legacy monthly archive keys like /leaderboard/30-11-2025 -> /leaderboard/monthly/2025/11
      {
        source: "/leaderboard/:day-:month-:year",
        destination: "/leaderboard/monthly/:year/:month",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/sitemap-products-:index(\\d+).xml",
        destination: "/sitemap-products/:index",
      },
      {
        source: "/sitemap-alternatives-:index(\\d+).xml",
        destination: "/sitemap-alternatives/:index",
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
