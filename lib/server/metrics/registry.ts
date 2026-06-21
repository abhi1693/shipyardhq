export function normalizeMetricRoute(url: string | undefined) {
  if (!url) return "unknown"

  let pathname = "unknown"
  try {
    pathname = new URL(url, "https://shipyard.local").pathname
  } catch {
    pathname = url.split("?")[0] || "unknown"
  }

  if (pathname === "/") return "/"
  if (pathname === "/metrics") return "/metrics"
  if (pathname === "/_next/image") return "/_next/image"
  if (pathname === "/markdown-for-agents") return "/markdown-for-agents"
  if (pathname.startsWith("/markdown-for-agents/")) {
    return "/markdown-for-agents/:path"
  }
  if (pathname.startsWith("/api/embed/products/")) {
    return "/api/embed/products/:slug"
  }
  if (pathname.startsWith("/api/products/") && pathname.endsWith("/upvote")) {
    return "/api/products/:slug/upvote"
  }
  if (pathname.startsWith("/api/products/") && pathname.includes("/media/")) {
    return "/api/products/:slug/media/:id"
  }
  if (pathname.startsWith("/api/products/") && pathname.endsWith("/media")) {
    return "/api/products/:slug/media"
  }
  if (pathname.startsWith("/api/")) return "/api/:path"
  if (pathname.startsWith("/member/products/add/")) {
    return "/member/products/add/:draftId/:step"
  }
  if (pathname.startsWith("/member/products/") && pathname.includes("/edit/")) {
    return "/member/products/:slug/edit/:step"
  }
  if (
    pathname.startsWith("/member/products/") &&
    pathname.endsWith("/analytics")
  ) {
    return "/member/products/:slug/analytics"
  }
  if (
    pathname.startsWith("/member/products/") &&
    pathname.endsWith("/upgrade")
  ) {
    return "/member/products/:slug/upgrade"
  }
  if (pathname.startsWith("/member/products/")) return "/member/products/:slug"
  if (pathname.startsWith("/member/")) return "/member/:path"
  if (pathname.startsWith("/products/")) return "/products/:slug"
  if (pathname.startsWith("/categories/")) return "/categories/:slug"
  if (pathname.startsWith("/alternatives/")) return "/alternatives/:slug"
  if (pathname.startsWith("/users/")) return "/users/:id"
  if (pathname.startsWith("/tags/")) return "/tags/:slug"
  if (pathname.startsWith("/platforms/")) return "/platforms/:platform"
  if (pathname.startsWith("/product-types/")) {
    return "/product-types/:productType"
  }
  if (pathname.startsWith("/pricing/")) return "/pricing/:pricingModel"
  if (pathname.startsWith("/use-cases/")) return "/use-cases/:slug"
  if (pathname.startsWith("/leaderboard/")) return "/leaderboard/:path"
  if (pathname.startsWith("/sitemap-")) return "/sitemap/:path"
  if (pathname.startsWith("/r/")) return "/r/:slug"

  return pathname
}
