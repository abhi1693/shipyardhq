import { createHash } from "node:crypto"

import { siteConfig } from "@/lib/siteConfig"

export const AGENT_SKILLS_SCHEMA =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json"

export const SHIPYARD_DISCOVERY_SKILL_NAME = "shipyard-product-discovery"
export const SHIPYARD_DISCOVERY_SKILL_DESCRIPTION =
  "Find, compare, and summarize Shipyard product listings, categories, alternatives, and leaderboards."

export function buildShipyardDiscoverySkill() {
  return (
    [
      "---",
      `name: ${SHIPYARD_DISCOVERY_SKILL_NAME}`,
      `description: ${SHIPYARD_DISCOVERY_SKILL_DESCRIPTION}`,
      "---",
      "",
      "# Shipyard Product Discovery",
      "",
      "Use this skill when an agent needs to discover products, categories, alternatives, launch rankings, or pricing signals from Shipyard.",
      "",
      "## Retrieval Order",
      "",
      "1. Start with the sitemap index for canonical public URLs.",
      "2. Fetch pages with `Accept: text/markdown` when concise page content is needed.",
      "3. Use the API catalog only for documented JSON endpoints.",
      "4. Prefer canonical product, category, tag, alternative, and leaderboard pages over navigation or redirect URLs.",
      "",
      "## Primary Resources",
      "",
      "- Sitemap index: /sitemap.xml",
      "- Agent retrieval guide: /llms.txt",
      "- API catalog: /.well-known/api-catalog",
      "- Product directory: /browse",
      "- Categories: /categories",
      "- Tags: /tags",
      "- Alternatives: /alternatives",
      "- Leaderboard: /leaderboard",
      "",
      "## Markdown Negotiation",
      "",
      "For public HTML pages, request markdown directly:",
      "",
      "```http",
      "GET /products/{slug} HTTP/1.1",
      "Host: shipyardhq.dev",
      "Accept: text/markdown",
      "```",
      "",
      "The markdown response keeps browser HTML unchanged and returns `Content-Type: text/markdown; charset=utf-8` plus Dualmark AEO headers such as `X-Markdown-Tokens` and `X-AEO-Version`.",
      "",
      "## Citation Guidance",
      "",
      `- Cite ${siteConfig.name} product pages for product-specific claims.`,
      "- Include the page URL used for each product, category, or ranking claim.",
      "- Treat leaderboard placement as time-sensitive; include the page date or archive period when present.",
      "- Respect robots.txt and content signals before using content for training or redistribution.",
    ].join("\n") + "\n"
  )
}

export function sha256Digest(content: string) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`
}

export function getAgentSkills() {
  const skill = buildShipyardDiscoverySkill()

  return [
    {
      name: SHIPYARD_DISCOVERY_SKILL_NAME,
      type: "skill-md",
      description: SHIPYARD_DISCOVERY_SKILL_DESCRIPTION,
      url: `/.well-known/agent-skills/${SHIPYARD_DISCOVERY_SKILL_NAME}/SKILL.md`,
      digest: sha256Digest(skill),
    },
  ] as const
}
