import { withDualmark } from "@dualmark/nextjs"
import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")
const dualmarkSiteUrl = stripTrailingSlash(
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
)
const googleAnalyticsHosts = [
  "https://www.googletagmanager.com",
  "https://*.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
] as const
const carbonScriptHosts = [
  "https://cdn.carbonads.com",
  "https://cdn4.buysellads.net",
] as const
const carbonConnectHosts = [
  "https://srv.carbonads.net",
  "https://srv.buysellads.com",
] as const
const cloudflareInsightsHosts = [
  "https://static.cloudflareinsights.com",
  "https://cloudflareinsights.com",
  "https://*.cloudflareinsights.com",
] as const
const faroCollectorOrigin = normalizeCspOrigin(process.env.NEXT_PUBLIC_FARO_URL)

function normalizeCspOrigin(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    )
    return url.origin
  } catch {
    return null
  }
}

const configuredClerkFrontendOrigins = [
  normalizeCspOrigin(process.env.NEXT_PUBLIC_CLERK_DOMAIN),
  normalizeCspOrigin(process.env.CLERK_DOMAIN),
  "https://clerk.shipyardhq.dev",
].filter((source, index, sources): source is string => {
  return Boolean(source) && sources.indexOf(source) === index
})

const clerkScriptHosts = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  ...configuredClerkFrontendOrigins,
  "https://challenges.cloudflare.com",
] as string[]
const clerkConnectHosts = [
  ...clerkScriptHosts,
  "https://clerk-telemetry.com",
  "https://*.clerk-telemetry.com",
] as string[]
const clerkFrameHosts = [
  "https://challenges.cloudflare.com",
  ...configuredClerkFrontendOrigins,
] as string[]

function buildContentSecurityPolicy() {
  const devConnectSources = isDev
    ? ["ws:", "http://localhost:*", "http://127.0.0.1:*"]
    : []
  const directives = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      ...googleAnalyticsHosts,
      ...carbonScriptHosts,
      ...cloudflareInsightsHosts,
      ...clerkScriptHosts,
    ],
    [
      "connect-src",
      "'self'",
      ...devConnectSources,
      ...googleAnalyticsHosts,
      ...carbonConnectHosts,
      ...cloudflareInsightsHosts,
      ...clerkConnectHosts,
      ...(faroCollectorOrigin ? [faroCollectorOrigin] : []),
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "blob:", "data:", "https:"],
    ["font-src", "'self'", "data:"],
    ["media-src", "'self'", "blob:", "data:", "https:"],
    ["frame-src", "'self'", ...clerkFrameHosts],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(isDev ? [] : [["upgrade-insecure-requests"]]),
  ]

  return directives
    .map(([directive, ...sources]) => [directive, ...sources].join(" "))
    .join("; ")
}

const contentSecurityPolicy = buildContentSecurityPolicy()
const htmlLimitedBots =
  /[\w-]+-Google|Google-[\w-]+|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: true,
  cacheComponents: true,
  // Hot mutable paths use the explicit Valkey-backed helpers. Next's separate
  // per-process Cache Components LRU retains one streamed render graph per
  // high-cardinality key and causes web pods to grow until V8 aborts.
  cacheMaxMemorySize: 0,
  htmlLimitedBots,
  staticPageGenerationTimeout: 600,
  experimental: {
    // Static generation imports Prisma in each worker. Keep build concurrency
    // below the shared pooler's client ceiling instead of bypassing PgBouncer.
    cpus: 2,
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 100,
    sri: {
      algorithm: "sha256",
    },
  },
  serverExternalPackages: [
    "bullmq",
    "dodopayments",
    "ioredis",
    "openai",
    "@opentelemetry/api",
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/exporter-metrics-otlp-http",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/sdk-node",
    "@opentelemetry/semantic-conventions",
    "@datadog/pprof",
    "@pyroscope/nodejs",
    "redis",
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
      {
        source: "/rewards/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/leaderboard/rewards/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/member/rewards/:path*",
        destination: "/",
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
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
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

export default withDualmark(nextConfig, {
  siteUrl: dualmarkSiteUrl,
  internalNamespace: "md",
})
