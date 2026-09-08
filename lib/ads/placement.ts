export function isCarbonTaxonomyPath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/"
  return (
    /^\/(?:categories|use-cases|alternatives|tags|platforms|product-types)(?:\/[^/]+)?$/.test(
      path,
    ) ||
    /^\/pricing\/[^/]+$/.test(path) ||
    /^\/categories\/[^/]+\/(?:pricing|platforms|product-types)\/[^/]+$/.test(
      path,
    ) ||
    /^\/use-cases\/[^/]+\/(?:categories|pricing|platforms)\/[^/]+$/.test(
      path,
    ) ||
    /^\/alternatives\/[^/]+\/categories\/[^/]+$/.test(path) ||
    /^\/(?:verified|editor-picks)\/[^/]+$/.test(path) ||
    /^\/trends\/categories\/[^/]+$/.test(path)
  )
}

export function isCarbonDiscoveryPath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/"
  return (
    path === "/" ||
    path === "/browse" ||
    isCarbonTaxonomyPath(path) ||
    /^\/products\/[^/]+$/.test(path) ||
    path === "/leaderboard" ||
    /^\/leaderboard\/(?:weekly|monthly)$/.test(path) ||
    /^\/leaderboard\/daily\/\d{4}\/\d{1,2}\/\d{1,2}$/.test(path) ||
    /^\/leaderboard\/(?:weekly|monthly)\/\d{4}\/\d{1,2}$/.test(path)
  )
}
