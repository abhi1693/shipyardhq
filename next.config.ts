import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@google-analytics/data",
    "bullmq",
    "dodopayments",
    "ioredis",
    "openai",
    "redis",
    "turndown",
    "turndown-plugin-gfm",
  ],
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
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        source: "/r/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
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
    loader: "custom",
    loaderFile: "./imageLoader.ts",
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 24, 32, 40, 48, 60, 64, 80, 96, 128, 160, 220, 256, 320],
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
