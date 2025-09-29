import type { ProductInsightSummary } from "./types"

export function buildProductInsightSummaryText(
  summary: ProductInsightSummary,
): string | null {
  if (!summary || typeof summary !== "object") return null
  const {
    overview,
    valuePropositions,
    targetUsers,
    keyFeatures,
    painPointsAddressed,
    toneAndStyle,
  } = summary

  const sections: string[] = []
  if (typeof overview === "string" && overview.trim()) {
    sections.push(overview.trim())
  }

  const renderList = (label: string, value: unknown) => {
    if (!Array.isArray(value) || !value.length) return
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
    if (!items.length) return
    sections.push(`${label}:\n- ${items.join("\n- ")}`)
  }

  renderList("Value propositions", valuePropositions)
  renderList("Target users", targetUsers)
  renderList("Key features", keyFeatures)
  renderList("Pain points addressed", painPointsAddressed)
  renderList("Tone & style", toneAndStyle)

  return sections.length ? sections.join("\n\n") : null
}
