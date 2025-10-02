import type { ComponentType } from "react"

import type {
  ProductAnalyticsNarrative,
  ProductTrafficSummary,
} from "@/types/analytics"
import { cn } from "@/lib/utils"
import { AlertTriangle, Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { formatCountryName } from "@/lib/geo"

interface AnalyticsNarrativeCardProps {
  narrative: ProductAnalyticsNarrative
  summary: ProductTrafficSummary
  rangeLabel: string
  variant?: "default" | "embedded"
}

function formatPercentage(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function formatReferrer(referrer?: string | null) {
  if (!referrer) return "Direct"
  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return referrer
  }
}

type ActionTone = "positive" | "warning" | "info"

interface ActionItem {
  title: string
  description: string
  tone: ActionTone
}

interface AnomalyItem {
  title: string
  description: string
}

interface NarrativeCardEntry {
  key: string
  title: string
  description?: string
  tone: ActionTone
  badge?: string
  icon?: ComponentType<{ className?: string }>
  titleClassName?: string
}

function normalizeCardTitle(raw: string, fallback: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  return trimmed.replace(/[.:;,-]+$/u, "")
}

function extractPrimaryContent(
  raw: string,
  fallbackTitle: string,
): { title: string; description?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { title: fallbackTitle }

  const delimiters: Array<[RegExp, (match: RegExpExecArray) => { title: string; description?: string }]> = [
    [/(.+?)\s*[—–]\s*(.+)/u, (match) => ({ title: match[1], description: match[2] })],
    [/(.+?);\s*(.+)/u, (match) => ({ title: match[1], description: match[2] })],
    [/(.+?):\s*(.+)/u, (match) => ({ title: match[1], description: match[2] })],
    [/(.+?)\.\s+(.+)/u, (match) => ({ title: match[1], description: match[2] })],
  ]

  for (const [pattern, projector] of delimiters) {
    const exec = pattern.exec(trimmed)
    if (exec) {
      const { title, description } = projector(exec)
      return {
        title: normalizeCardTitle(title, fallbackTitle),
        description: description?.trim() || undefined,
      }
    }
  }

  return {
    title: normalizeCardTitle(trimmed, fallbackTitle),
  }
}

const toneIconMap: Record<ActionTone, ComponentType<{ className?: string }>> = {
  warning: AlertTriangle,
  positive: TrendingUp,
  info: Lightbulb,
}

const toneBorderClass: Record<ActionTone, string> = {
  warning: "border-l-4 border-l-rose-500",
  positive: "border-l-4 border-l-emerald-500",
  info: "border-l-4 border-l-slate-400",
}

const toneIconClass: Record<ActionTone, string> = {
  warning: "text-rose-600",
  positive: "text-emerald-600",
  info: "text-slate-600",
}

function sanitizeRefLabel(raw?: string | null): string | null {
  if (raw == null) return "Direct"
  const trimmed = raw.trim()
  if (!trimmed) return "Direct"
  const lowered = trimmed.toLowerCase()
  if (lowered === "none" || lowered === "unknown") return null
  if (lowered.includes("/")) {
    const [primary] = trimmed.split("/")
    const primaryTrimmed = primary.trim()
    if (!primaryTrimmed) return null
    const primaryLower = primaryTrimmed.toLowerCase()
    if (primaryLower === "none" || primaryLower === "unknown") return null
    return primaryTrimmed
  }
  return trimmed
}

function buildActionItems(
  summary: ProductTrafficSummary,
  narrative: ProductAnalyticsNarrative,
): ActionItem[] {
  const items: ActionItem[] = []
  const { totalViewsChange, clicksChange, upvotesChange } = summary
  const ctr = summary.clickThroughRate
  const topReferrerData = summary.topReferrer
  const topReferrer =
    topReferrerData && (topReferrerData.views ?? 0) > 0
      ? sanitizeRefLabel(topReferrerData.referrer)
      : null
  const countryRaw = summary.topCountry?.country?.trim()
  const topCountryName =
    countryRaw && countryRaw.toLowerCase() !== "unknown"
      ? formatCountryName(countryRaw)
      : null
  const hasCountry =
    topCountryName &&
    topCountryName !== "Unknown" &&
    (summary.topCountry?.views ?? 0) > 0

  if (typeof totalViewsChange === "number" && totalViewsChange <= -5) {
    items.push({
      title: "Rebuild traffic reach",
      description:
        topReferrer && topReferrer !== ""
          ? `Views fell ${formatPercentage(Math.abs(totalViewsChange))}. Relaunch campaigns where ${formatReferrer(topReferrer)} previously over-delivered.`
          : `Views fell ${formatPercentage(Math.abs(totalViewsChange))}. Share across socials and partner channels to refill the funnel.`,
      tone: "warning",
    })
  }

  if (typeof clicksChange === "number" && clicksChange <= -5) {
    items.push({
      title: "Refresh CTA messaging",
      description: `CTA clicks dipped ${formatPercentage(Math.abs(clicksChange))}. Test a sharper headline or adjust placement to lift engagement.`,
      tone: "warning",
    })
  } else if (typeof ctr === "number" && ctr < 5) {
    items.push({
      title: "Improve conversion path",
      description: `Current CTR is ${formatPercentage(ctr)}. Experiment with stronger incentives or simplify the sign-up flow.`,
      tone: "info",
    })
  }

  if (
    summary.upvotesInRange <= 0 ||
    (typeof upvotesChange === "number" && upvotesChange <= 0)
  ) {
    items.push({
      title: "Spark community advocacy",
      description: `Invite recent visitors to leave feedback or reviews—no new upvotes landed this window.`,
      tone: "info",
    })
  }

  if (
    typeof totalViewsChange === "number" &&
    totalViewsChange >= 8 &&
    topReferrer
  ) {
    items.push({
      title: "Double down on winning channel",
      description: `${formatReferrer(topReferrer)} is driving momentum. Allocate more posts or spend there while traffic is up ${formatPercentage(totalViewsChange)}.`,
      tone: "positive",
    })
  }

  if (hasCountry && topCountryName) {
    items.push({
      title: "Localize for biggest audience",
      description: `${topCountryName} leads traffic. Tailor landing copy or pricing to match that market's expectations.`,
      tone: "info",
    })
  }

  const anomaly = summary.advanced?.anomalies?.[0]
  if (anomaly) {
    items.push({
      title: "Investigate traffic anomaly",
      description: `${anomaly.description}—validate the spike and document learnings for future launches.`,
      tone: "warning",
    })
  }

  if (!items.length && narrative.highlights?.length) {
    items.push({
      title: "Leverage current momentum",
      description: narrative.highlights[0],
      tone: "info",
    })
  }

  const seen = new Set<string>()
  return items
    .filter((item) => {
      if (seen.has(item.title)) return false
      seen.add(item.title)
      return true
    })
    .slice(0, 4)
}

function buildAnomalyItems(summary: ProductTrafficSummary): AnomalyItem[] {
  return (
    summary.advanced?.anomalies?.slice(0, 2).map((anomaly) => ({
      title: anomaly.type.replace(/-/g, " "),
      description: anomaly.description,
    })) ?? []
  )
}

export function AnalyticsNarrativeCard({
  narrative,
  summary,
  rangeLabel,
  variant = "default",
}: AnalyticsNarrativeCardProps) {
  const sourceLabel =
    narrative.source === "ai" ? "AI performance brief" : "Performance brief"
  const watchouts = narrative.watchouts ?? []

  const actions = buildActionItems(summary, narrative)
  const anomalies = buildAnomalyItems(summary)
  const cards: NarrativeCardEntry[] = [
    ...watchouts.map((item, index) => {
      const fallbackTitle = watchouts.length > 1 ? `Watchout ${index + 1}` : "Watchout"
      const { title, description } = extractPrimaryContent(item, fallbackTitle)
      return {
        key: `watchout-${index}`,
        title,
        description,
        tone: "warning" as const,
        badge: "Watchout",
        icon: AlertTriangle,
      }
    }),
    ...actions.map((action) => ({
      key: `action-${action.title}`,
      title: action.title,
      description: action.description,
      tone: action.tone,
    })),
    ...anomalies.map((anomaly, index) => ({
      key: `anomaly-${index}`,
      title: anomaly.title,
      description: anomaly.description,
      tone: "info" as const,
      badge: "Anomaly",
      icon: AlertTriangle,
      titleClassName: "capitalize",
    })),
  ]
  const containerClass = cn(
    "space-y-4",
    variant === "default"
      ? "rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
      : "",
  )

  return (
    <div className={containerClass}>
      {variant === "default" ? (
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-[color:var(--brand-1)/0.12] p-2 text-[color:var(--brand-1)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {sourceLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Window: {rangeLabel}
            </p>
          </div>
        </div>
      ) : null}

      {cards.length ? (
        <section className="space-y-2">
          <div className="grid grid-flow-col auto-cols-[minmax(18rem,_1fr)] gap-3 overflow-x-auto pb-1 sm:pb-0">
            {cards.map((card) => {
              const Icon = card.icon ?? toneIconMap[card.tone]
              return (
                <div
                  key={card.key}
                  className={cn(
                    "flex h-full min-w-[18rem] flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm border-l-4",
                    toneBorderClass[card.tone],
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-md bg-slate-200/60 p-2">
                      <Icon
                        className={cn("h-4 w-4", toneIconClass[card.tone])}
                        aria-hidden
                      />
                    </span>
                    <div className="space-y-1">
                      {card.badge ? (
                        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          {card.badge}
                        </span>
                      ) : null}
                      <div className={cn("text-sm font-semibold", card.titleClassName)}>
                        {card.title}
                      </div>
                      {card.description ? (
                        <p className="text-sm leading-relaxed text-current">
                          {card.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
