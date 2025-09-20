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
  webpack(config) {
    const matchesOtWarning = (warning: any) => {
      if (!warning || typeof warning !== "object") return false
      const resource: string | undefined = warning.module?.resource
      if (!resource) return false
      return (
        resource.includes("@opentelemetry/instrumentation") ||
        resource.includes("prisma-instrumentation-5-x")
      )
    }

    config.ignoreWarnings = [...(config.ignoreWarnings || []), matchesOtWarning]

    return config
  },
}

export default nextConfig
