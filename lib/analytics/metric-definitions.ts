/** Reporting labels only. Keep storage and leaderboard inputs unchanged. */
export const ANALYTICS_METRICS = {
  requests: {
    label: "HTTP requests",
    description:
      "Cloudflare zone HTTP request counts include pages, assets, APIs, crawlers, and repeated activity. They are not unique people or qualified buyers.",
  },
  visits: {
    label: "Cloudflare visits",
    description:
      "Cloudflare’s visits measure can include automated and repeated activity. It is not a count of unique people or founder referrals.",
  },
  websiteClicks: {
    label: "Website clicks (lifetime)",
    description:
      "Recorded outbound clicks since tracking began, across free listing redirects and eligible paid direct links. Repeated or automated clicks may be included; clicks do not establish signups or customers.",
  },
} as const

export function trafficScopeDescription(scope: "site" | "listing") {
  return scope === "site"
    ? "Site traffic is raw zone HTTP data without host, path, or bot filters."
    : "Product traffic filters raw zone HTTP data to listing paths, without a bot filter."
}
