"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import { ChevronDownIcon } from "lucide-react"

import { scheduleProductInsightsPipeline } from "@/actions/member/products/insights"
import type {
  ProductInsightComprehensiveReport,
  ProductInsightPipelineJobState,
  ProductInsightRedditDiscussionQuery,
  ProductInsightRedditInsightReport,
  ProductInsightRedditThread,
  ProductInsightReportActionPriority,
  ProductInsightStatus,
  ProductInsightCompetitor,
  ProductInsightSubreddit,
  ProductInsightSubredditQuery,
  SerializedInsightProfile,
} from "@/types/product-insights"
import type {
  ProductInsightPageSnapshot,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import { Button } from "@/components/atoms/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/atoms/collapsible"
import type { ChartConfig } from "@/components/atoms/chart"
import { AnalyticsPieChart } from "@/components/molecules/AnalyticsPieChart"
import { Switch } from "@/components/atoms/switch"
import { Label } from "@/components/atoms/label"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<
  ProductInsightStatus,
  { label: string; badge: ComponentProps<typeof Badge>["variant"] }
> = {
  pending: { label: "Processing", badge: "secondary" },
  ready: { label: "Ready", badge: "success" },
  failed: { label: "Failed", badge: "destructive" },
}

const SENTIMENT_BADGE_VARIANT: Record<
  "positive" | "negative" | "neutral",
  ComponentProps<typeof Badge>["variant"]
> = {
  positive: "success",
  negative: "destructive",
  neutral: "secondary",
}

const SENTIMENT_BADGE_LABEL: Record<
  "positive" | "negative" | "neutral",
  string
> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
}

const SENTIMENT_COLORS: Record<"positive" | "negative" | "neutral", string> = {
  positive: "var(--chart-2)",
  negative: "var(--destructive)",
  neutral: "var(--chart-3)",
}

const ACTION_PRIORITY_BADGE: Record<
  ProductInsightReportActionPriority,
  { label: string; badge: ComponentProps<typeof Badge>["variant"] }
> = {
  high: { label: "High priority", badge: "destructive" },
  medium: { label: "Medium priority", badge: "secondary" },
  low: { label: "Low priority", badge: "outline" },
  watch: { label: "Monitor", badge: "secondary" },
}

const ACTION_PRIORITY_COLORS: Record<
  ProductInsightReportActionPriority,
  string
> = {
  high: "var(--destructive)",
  medium: "var(--chart-1)",
  low: "var(--chart-2)",
  watch: "var(--chart-4)",
}

const COUNT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const REQUIRED_QUERY_COVERAGE_PERCENT = 70

type ProductInsightsViewProps = {
  slug: string
  productName: string
  websiteUrl: string
  initialProfile: SerializedInsightProfile | null
}

type SummarySection = {
  title: string
  items: string[]
}

type MetricTone = "neutral" | "positive" | "warning" | "danger"

type SitemapEntryStatus = "ok" | "error" | "unknown"

const METRIC_TONE_STYLES: Record<MetricTone, string> = {
  neutral: "text-foreground",
  positive: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
}

const FACT_TONE_STYLES: Record<MetricTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-foreground",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
}

const METRIC_TONE_BAR: Record<MetricTone, string> = {
  neutral: "bg-slate-300",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
}

const SITEMAP_ITEM_STYLES: Record<SitemapEntryStatus, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800",
  error:
    "border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60",
  unknown:
    "border-slate-200 bg-slate-50 text-muted-foreground hover:border-primary/40 hover:text-primary",
}

const SITEMAP_INDICATOR_STYLES: Record<SitemapEntryStatus, string> = {
  ok: "bg-emerald-500",
  error: "bg-destructive",
  unknown: "bg-slate-400",
}

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: ReactNode
  tone?: MetricTone
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-medium", METRIC_TONE_STYLES[tone])}>
        {value}
      </div>
    </div>
  )
}

function InfoNotice({
  tone,
  children,
  size = "sm",
}: {
  tone: "info" | "error"
  children: ReactNode
  size?: "sm" | "xs"
}) {
  const base = "rounded-lg border p-3"
  const textSize = size === "xs" ? "text-xs" : "text-sm"
  if (tone === "error") {
    return (
      <div
        className={cn(
          base,
          textSize,
          "border-destructive/40 bg-destructive/10 text-destructive",
        )}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        base,
        textSize,
        "border-primary/20 bg-primary/5 text-primary",
      )}
    >
      {children}
    </div>
  )
}

function StageBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  )
}

type StageCardProps = {
  step: string
  title: string
  description: string
  status: { label: string; badge: ComponentProps<typeof Badge>["variant"] }
  actions?: ReactNode
  metrics?: ReadonlyArray<{
    label: string
    value: ReactNode
    tone?: MetricTone
  }>
  collapsible?: boolean
  defaultOpen?: boolean
  children: ReactNode
}

function StageCard({
  step,
  title,
  description,
  status,
  actions,
  metrics,
  collapsible = false,
  defaultOpen = true,
  children,
}: StageCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const previousDefaultOpen = useRef(defaultOpen)

  useEffect(() => {
    if (!collapsible) {
      previousDefaultOpen.current = defaultOpen
      return
    }

    if (defaultOpen && !previousDefaultOpen.current) {
      setIsOpen(true)
    }

    previousDefaultOpen.current = defaultOpen
  }, [collapsible, defaultOpen])

  const header = (withTrigger: boolean) => (
    <CardHeader className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <StageBadge label={step} />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Badge variant={status.badge} className="text-xs">
            {status.label}
          </Badge>
          {actions}
          {withTrigger ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                )}
              >
                {isOpen ? "Hide details" : "Show details"}
                <ChevronDownIcon
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isOpen ? "rotate-180" : "rotate-0",
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
          ) : null}
        </div>
      </div>
      {!!metrics?.length && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone ?? "neutral"}
            />
          ))}
        </div>
      )}
    </CardHeader>
  )

  if (!collapsible) {
    return (
      <Card>
        {header(false)}
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {header(true)}
        <CollapsibleContent asChild>
          <CardContent className="space-y-6">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

type FlowStageSummary = {
  step: string
  title: string
  description: string
  status: { label: string; badge: ComponentProps<typeof Badge>["variant"] }
  metrics: Array<{ label: string; value: ReactNode }>
}

function FlowOverview({ stages }: { stages: FlowStageSummary[] }) {
  if (!stages.length) return null
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Insights pipeline</CardTitle>
        <CardDescription>
          Track progress across the discovery sequence and jump into the stage
          that needs attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage) => (
            <div
              key={stage.title}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <StageBadge label={stage.step} />
                <Badge variant={stage.status.badge} className="text-[11px]">
                  {stage.status.label}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {stage.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {stage.description}
                </div>
              </div>
              <dl className="space-y-2 text-xs text-muted-foreground">
                {stage.metrics.map((metric) => (
                  <div
                    key={`${stage.title}-${metric.label}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <dt>{metric.label}</dt>
                    <dd className="font-medium text-foreground">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductInsightsView({
  slug,
  productName,
  websiteUrl,
  initialProfile,
}: ProductInsightsViewProps) {
  const [profile, setProfile] = useState<SerializedInsightProfile | null>(
    initialProfile,
  )
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [competitorProgress, setCompetitorProgress] = useState<string | null>(
    null,
  )
  const [subredditProgress, setSubredditProgress] = useState<string | null>(
    null,
  )
  const [discussionProgress, setDiscussionProgress] = useState<string | null>(
    null,
  )
  const [reportProgress, setReportProgress] = useState<string | null>(null)
  const [pipelineNotice, setPipelineNotice] = useState<{
    tone: "info" | "error"
    message: string
  } | null>(null)
  const [isRunningPipeline, startPipelineTransition] = useTransition()
  const [isDeepMode, setIsDeepMode] = useState(
    () => initialProfile?.redditMode === "deep",
  )

  const selectedHarvestMode = isDeepMode ? "deep" : "standard"
  const deepHarvestSwitchId = useId()
  const activeHarvestModeLabel = profile?.redditMode
    ? profile.redditMode === "deep"
      ? "Deep (expanded)"
      : "Standard"
    : selectedHarvestMode === "deep"
      ? "Deep (requested)"
      : "Standard"

  const summary = (profile?.summary || undefined) as
    | ProductInsightSummary
    | undefined

  const summarySections: SummarySection[] = useMemo(() => {
    if (!summary) return []
    return [
      { title: "Value propositions", items: summary.valuePropositions || [] },
      { title: "Target users", items: summary.targetUsers || [] },
      { title: "Key features", items: summary.keyFeatures || [] },
      {
        title: "Pain points addressed",
        items: summary.painPointsAddressed || [],
      },
      { title: "Tone & style", items: summary.toneAndStyle || [] },
    ].filter((section) => section.items.length)
  }, [summary])

  const pages = useMemo(() => {
    return Array.isArray(profile?.pages)
      ? (profile!.pages as ProductInsightPageSnapshot[])
      : []
  }, [profile])

  const pageCount = pages.length

  const erroredPages = useMemo(
    () => pages.filter((page) => page.status === "error"),
    [pages],
  )

  const handleRunPipeline = () => {
    setPipelineNotice({
      tone: "info",
      message:
        "Running the full insights pipeline. We will email you once everything is ready.",
    })
    setProgressMessage("Starting crawl and synthesis…")
    setCompetitorProgress("Mapping competitive landscape…")
    setSubredditProgress("Preparing community discovery…")
    setDiscussionProgress("Queued for discussion analysis…")
    setReportProgress("Queued for comprehensive report…")

    setProfile((prev) => {
      if (!prev) return prev

      const stages = [
        { statusKey: "status", errorKey: "errorMessage" },
        { statusKey: "competitorStatus", errorKey: "competitorErrorMessage" },
        { statusKey: "subredditStatus", errorKey: "subredditErrorMessage" },
        { statusKey: "redditStatus", errorKey: "redditErrorMessage" },
        { statusKey: "finalReportStatus", errorKey: "finalReportErrorMessage" },
      ] as const

      const updated: SerializedInsightProfile = {
        ...prev,
        pipelineJobState: "queued",
        redditMode: selectedHarvestMode,
      }

      const firstFailedIndex = stages.findIndex(
        ({ statusKey }) => prev[statusKey] === "failed",
      )

      stages.forEach(({ statusKey, errorKey }, index) => {
        if (firstFailedIndex === -1 || index >= firstFailedIndex) {
          // reset downstream stages so the new pipeline run can progress cleanly
          updated[statusKey] = "pending"
          updated[errorKey] = null
        }
      })

      return updated
    })

    startPipelineTransition(async () => {
      try {
        const result = await scheduleProductInsightsPipeline(slug, {
          discussionsMode: selectedHarvestMode,
        })
        setProfile((prev) => {
          if (!result.profile) return prev
          const nextProfile: SerializedInsightProfile = {
            ...result.profile,
            redditMode: result.executedInline
              ? (result.profile.redditMode ?? selectedHarvestMode)
              : selectedHarvestMode,
          }
          return nextProfile
        })
        if (result.executedInline) {
          if (result.profile?.redditMode) {
            setIsDeepMode(result.profile.redditMode === "deep")
          }
        } else {
          setIsDeepMode(selectedHarvestMode === "deep")
        }

        if (result.executedInline) {
          setProgressMessage("Latest crawl captured and summarized.")
          setCompetitorProgress("Competitive intel refreshed.")
          setSubredditProgress("Community recommendations refreshed.")
          setDiscussionProgress("Discussion insights updated.")
          setReportProgress(
            "Comprehensive report ready—check your inbox for the overview.",
          )
          setPipelineNotice({
            tone: "info",
            message:
              "Pipeline completed immediately. We just sent the insights recap to your email.",
          })
          toast.success(
            "Insights pipeline completed. Check your email for the full report.",
          )
        } else {
          setProgressMessage("Crawl queued to run in the background.")
          setCompetitorProgress(
            "Competitor research will run after the crawl finishes.",
          )
          setSubredditProgress(
            "Community discovery will run once the queue processes.",
          )
          setDiscussionProgress("Discussion analysis will start automatically.")
          setReportProgress(
            "Report synthesis will begin after upstream steps finish.",
          )
          setPipelineNotice({
            tone: "info",
            message: result.alreadyQueued
              ? "Insights pipeline is already running. We'll let you know when it's ready."
              : "Pipeline queued successfully. We'll email you when the insights are ready.",
          })
          toast.success(
            result.alreadyQueued
              ? "Pipeline already running. We'll notify you once it's done."
              : "Pipeline queued. We'll email you when the insights are ready.",
          )
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to run insights pipeline"
        setPipelineNotice({ tone: "error", message })
        setProgressMessage(null)
        setCompetitorProgress(null)
        setSubredditProgress(null)
        setDiscussionProgress(null)
        setReportProgress(null)
        setProfile((prev) =>
          prev ? { ...prev, pipelineJobState: "idle" } : prev,
        )
        toast.error(message)
      }
    })
  }

  const statusDisplay = profile
    ? STATUS_STYLES[profile.status]
    : isRunningPipeline
      ? { label: "Processing", badge: "secondary" as const }
      : { label: "Not generated", badge: "outline" as const }

  const lastCrawled = profile?.lastCrawledAt
    ? formatDistanceToNowStrict(new Date(profile.lastCrawledAt), {
        addSuffix: true,
      })
    : "Never"

  const discoveredUrls = useMemo(() => {
    return Array.isArray(profile?.discoveredUrls)
      ? (profile!.discoveredUrls as string[])
      : []
  }, [profile])

  const competitors = useMemo(() => {
    return Array.isArray(profile?.competitors)
      ? (profile!.competitors as ProductInsightCompetitor[])
      : []
  }, [profile])

  const sortedCompetitors = useMemo(() => {
    if (!competitors.length) return []
    return [...competitors].sort((a, b) => {
      const aScore =
        typeof a.similarityScore === "number" ? a.similarityScore : -1
      const bScore =
        typeof b.similarityScore === "number" ? b.similarityScore : -1
      if (bScore !== aScore) return bScore - aScore
      const aName = a.name?.toLowerCase() ?? ""
      const bName = b.name?.toLowerCase() ?? ""
      return aName.localeCompare(bName)
    })
  }, [competitors])

  const competitorResearchNotes = useMemo(() => {
    if (!Array.isArray(profile?.competitorResearchNotes)) return []
    return profile!.competitorResearchNotes.filter(
      (note): note is string =>
        typeof note === "string" && note.trim().length > 0,
    )
  }, [profile])

  const competitorModel = profile?.competitorModel ?? null

  const hasCompetitorResults = sortedCompetitors.length > 0

  const competitorStatus = profile?.competitorStatus ?? null
  const competitorStatusDisplay = competitorStatus
    ? STATUS_STYLES[competitorStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastCompetitorDiscovery = profile?.lastCompetitorDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastCompetitorDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const shouldShowCompetitorEmptyState =
    !hasCompetitorResults && !isRunningPipeline
  const shouldSurfaceCompetitorNotices = Boolean(
    competitorProgress ||
      profile?.competitorErrorMessage ||
      shouldShowCompetitorEmptyState,
  )

  const shouldOpenCompetitorStage =
    hasCompetitorResults ||
    !!competitorProgress ||
    !!profile?.competitorErrorMessage ||
    competitorStatus === "pending" ||
    competitorStatus === "failed"

  const subredditQueries = useMemo(() => {
    return Array.isArray(profile?.subredditQueries)
      ? (profile!.subredditQueries as ProductInsightSubredditQuery[])
      : []
  }, [profile])

  const subreddits = useMemo(() => {
    return Array.isArray(profile?.subreddits)
      ? (profile!.subreddits as ProductInsightSubreddit[])
      : []
  }, [profile])

  const hasSubredditResults = subreddits.length > 0

  const topSubreddits = useMemo(() => {
    if (!subreddits.length) return []
    return [...subreddits]
      .sort((a, b) => {
        const aScore =
          typeof a.relevanceScore === "number" ? a.relevanceScore : -1
        const bScore =
          typeof b.relevanceScore === "number" ? b.relevanceScore : -1
        if (bScore !== aScore) return bScore - aScore
        const aSubscribers =
          typeof a.subscribers === "number" ? a.subscribers : 0
        const bSubscribers =
          typeof b.subscribers === "number" ? b.subscribers : 0
        return bSubscribers - aSubscribers
      })
      .slice(0, 4)
  }, [subreddits])

  const communityStats = useMemo(() => {
    let subscriberTotal = 0
    let nsfwCount = 0
    let relevanceSum = 0
    let relevanceCount = 0
    const matchedQuerySet = new Set<string>()
    const queryMatchCounts = new Map<string, number>()

    for (const subreddit of subreddits) {
      if (typeof subreddit.subscribers === "number") {
        subscriberTotal += subreddit.subscribers
      }
      if (subreddit.over18) {
        nsfwCount += 1
      }
      if (typeof subreddit.relevanceScore === "number") {
        relevanceSum += subreddit.relevanceScore
        relevanceCount += 1
      }
      if (Array.isArray(subreddit.matchedQueries)) {
        for (const query of subreddit.matchedQueries) {
          if (!query) continue
          matchedQuerySet.add(query)
          queryMatchCounts.set(query, (queryMatchCounts.get(query) ?? 0) + 1)
        }
      }
    }

    let queriesCovered = 0
    for (const query of subredditQueries) {
      if (matchedQuerySet.has(query.query)) {
        queriesCovered += 1
      }
    }

    const queryCoveragePercent =
      subredditQueries.length > 0
        ? (queriesCovered / subredditQueries.length) * 100
        : null

    return {
      totalSubscribers: subscriberTotal,
      nsfwCount,
      avgRelevance: relevanceCount ? relevanceSum / relevanceCount : null,
      queriesCovered,
      queryCoveragePercent,
      queryMatchCounts,
    }
  }, [subreddits, subredditQueries])

  const avgRelevancePercent =
    communityStats.avgRelevance !== null
      ? communityStats.avgRelevance * 100
      : null
  const coveragePercent = communityStats.queryCoveragePercent
  const coverageNeedsAttention =
    coveragePercent !== null &&
    coveragePercent < REQUIRED_QUERY_COVERAGE_PERCENT

  const discoveryQuickFacts: Array<{
    label: string
    value: string
    tone: MetricTone
  }> = [
    {
      label: "Audience reach",
      value: communityStats.totalSubscribers
        ? `${COUNT_FORMATTER.format(communityStats.totalSubscribers)} people`
        : "—",
      tone: communityStats.totalSubscribers ? "positive" : "neutral",
    },
    {
      label: "Avg relevance",
      value:
        avgRelevancePercent !== null
          ? `${PERCENT_FORMATTER.format(avgRelevancePercent)}% match`
          : "—",
      tone:
        avgRelevancePercent !== null
          ? avgRelevancePercent >= 70
            ? "positive"
            : avgRelevancePercent >= 40
              ? "neutral"
              : "warning"
          : "neutral",
    },
    {
      label: "Adult-only communities",
      value: `${communityStats.nsfwCount} group${communityStats.nsfwCount === 1 ? "" : "s"}`,
      tone: communityStats.nsfwCount ? "warning" : "neutral",
    },
    {
      label: "Query coverage",
      value:
        coveragePercent !== null
          ? `${PERCENT_FORMATTER.format(coveragePercent)}% coverage`
          : subredditQueries.length
            ? "0% coverage"
            : "—",
      tone:
        coveragePercent !== null
          ? coveragePercent >= 75
            ? "positive"
            : coveragePercent >= 40
              ? "neutral"
              : "warning"
          : subredditQueries.length
            ? "danger"
            : "neutral",
    },
  ]

  const shouldShowSubredditEmptyState =
    !hasSubredditResults && !isRunningPipeline
  const shouldSurfaceSubredditNotices = Boolean(
    subredditProgress ||
      profile?.subredditErrorMessage ||
      shouldShowSubredditEmptyState ||
      coverageNeedsAttention,
  )

  const subredditStatus = profile?.subredditStatus ?? null
  const subredditStatusDisplay = subredditStatus
    ? STATUS_STYLES[subredditStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastSubredditDiscovery = profile?.lastSubredditDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastSubredditDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const discussionQueries = useMemo(() => {
    return Array.isArray(profile?.redditDiscussionQueries)
      ? (profile!
          .redditDiscussionQueries as ProductInsightRedditDiscussionQuery[])
      : []
  }, [profile])

  const discussionThreads = useMemo(() => {
    return Array.isArray(profile?.redditDiscussions)
      ? (profile!.redditDiscussions as ProductInsightRedditThread[])
      : []
  }, [profile])

  const discussionInsights =
    (profile?.redditInsights as ProductInsightRedditInsightReport | null) ??
    null

  const discussionSections = useMemo(() => {
    if (!Array.isArray(discussionInsights?.sections)) return []
    return discussionInsights!.sections!.filter(Boolean)
  }, [discussionInsights])

  const focusAreas = useMemo(() => {
    if (!Array.isArray(discussionInsights?.recommendedFocus)) return []
    return (discussionInsights!.recommendedFocus as string[]).filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    )
  }, [discussionInsights])

  const totalFocusAreas = focusAreas.length

  const discussionSignals = useMemo(() => {
    const signals: Array<{
      id: string
      sectionTitle: string | null
      insight: string
      sentiment: "positive" | "negative" | "neutral" | null
      audience: string | null
      primaryEvidence: string | null
      evidenceCount: number
      references: string[] | null
    }> = []

    discussionSections.forEach((section, sectionIndex) => {
      const sectionTitle =
        typeof section?.title === "string" && section.title.length > 0
          ? section.title
          : null
      const sectionItems = Array.isArray(section?.items) ? section.items : []

      sectionItems.forEach((item, itemIndex) => {
        if (!item) return
        const insightText =
          typeof item.insight === "string" && item.insight.length > 0
            ? item.insight
            : "Untitled insight"
        const sentiment =
          item.sentiment === "positive" ||
          item.sentiment === "negative" ||
          item.sentiment === "neutral"
            ? item.sentiment
            : null
        const evidenceEntries = Array.isArray(item.evidence)
          ? item.evidence.filter(
              (entry): entry is string =>
                typeof entry === "string" && entry.length > 0,
            )
          : []
        const references = Array.isArray(item.references)
          ? item.references.filter(
              (entry): entry is string =>
                typeof entry === "string" && entry.length > 0,
            )
          : []

        signals.push({
          id: `${sectionIndex}-${itemIndex}`,
          sectionTitle,
          insight: insightText,
          sentiment,
          audience:
            typeof item.audience === "string" && item.audience.length > 0
              ? item.audience
              : null,
          primaryEvidence: evidenceEntries[0] ?? null,
          evidenceCount: evidenceEntries.length,
          references: references.length ? references : null,
        })
      })
    })

    return signals
  }, [discussionSections])

  const sentimentCounts = useMemo(
    () =>
      discussionSignals.reduce(
        (acc, signal) => {
          if (signal.sentiment) {
            acc[signal.sentiment] += 1
          }
          return acc
        },
        {
          positive: 0,
          negative: 0,
          neutral: 0,
        } as Record<"positive" | "negative" | "neutral", number>,
      ),
    [discussionSignals],
  )

  const totalSignals = discussionSignals.length
  const topDiscussionSignals = useMemo(
    () => discussionSignals.slice(0, 4),
    [discussionSignals],
  )

  const hasDiscussionThreads = discussionThreads.length > 0

  const totalCommentsSampled = discussionThreads.reduce((sum, thread) => {
    const commentCount = thread.topComments?.length ?? 0
    return sum + commentCount
  }, 0)

  const discussionStatus = profile?.redditStatus ?? null
  const discussionStatusDisplay = discussionStatus
    ? STATUS_STYLES[discussionStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastDiscussionDiscovery = profile?.lastRedditDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastRedditDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const discussionQuickFacts: Array<{
    label: string
    value: string
    tone: MetricTone
  }> = [
    {
      label: "Last analyzed",
      value: lastDiscussionDiscovery,
      tone: profile ? "neutral" : "warning",
    },
    {
      label: "Threads captured",
      value: profile
        ? hasDiscussionThreads
          ? `${COUNT_FORMATTER.format(discussionThreads.length)}`
          : "0"
        : "—",
      tone: profile
        ? hasDiscussionThreads
          ? "positive"
          : "warning"
        : "neutral",
    },
    {
      label: "Comments reviewed",
      value: profile
        ? totalCommentsSampled
          ? `${COUNT_FORMATTER.format(totalCommentsSampled)}`
          : "0"
        : "—",
      tone: profile
        ? totalCommentsSampled
          ? "neutral"
          : "warning"
        : "neutral",
    },
    {
      label: "Focus themes",
      value: discussionInsights
        ? totalFocusAreas
          ? `${COUNT_FORMATTER.format(totalFocusAreas)}`
          : "0"
        : "—",
      tone: discussionInsights
        ? totalFocusAreas
          ? "positive"
          : "warning"
        : "neutral",
    },
  ]

  const sentimentTotal =
    sentimentCounts.positive +
    sentimentCounts.negative +
    sentimentCounts.neutral
  const shouldShowDiscussionEmptyState =
    !hasDiscussionThreads && !isRunningPipeline
  const shouldSurfaceDiscussionNotices = Boolean(
    discussionProgress ||
      profile?.redditErrorMessage ||
      shouldShowDiscussionEmptyState,
  )

  const successfulPages = Math.max(pageCount - erroredPages.length, 0)
  const crawlerHealthPercent = pageCount
    ? Math.round((successfulPages / pageCount) * 100)
    : 0
  const crawlerHealthTone: MetricTone = pageCount
    ? crawlerHealthPercent >= 85
      ? "positive"
      : crawlerHealthPercent >= 60
        ? "warning"
        : "danger"
    : "neutral"

  const crawlerFactBase = [
    {
      factLabel: "Last crawl",
      metricLabel: "Last crawled",
      value: lastCrawled,
      tone: profile
        ? lastCrawled === "Never"
          ? "warning"
          : "neutral"
        : "warning",
    },
    {
      factLabel: "Pages captured",
      value: profile ? COUNT_FORMATTER.format(pageCount) : "—",
      tone: profile ? (pageCount ? "neutral" : "warning") : "neutral",
    },
    {
      factLabel: "Errors found",
      metricLabel: "Errors",
      value: profile ? COUNT_FORMATTER.format(erroredPages.length) : "—",
      tone: profile ? (erroredPages.length ? "danger" : "positive") : "neutral",
    },
  ] as const satisfies ReadonlyArray<{
    factLabel: string
    metricLabel?: string
    value: string
    tone: MetricTone
  }>

  const sitemapEntries = useMemo(() => {
    const seen = new Set<string>()
    const entries: Array<{ url: string; status: SitemapEntryStatus }> = []

    for (const page of pages) {
      if (!page?.url || seen.has(page.url)) continue
      seen.add(page.url)
      entries.push({
        url: page.url,
        status: page.status === "ok" ? "ok" : "error",
      })
    }

    for (const url of discoveredUrls) {
      if (!url || seen.has(url)) continue
      seen.add(url)
      entries.push({ url, status: "unknown" })
    }

    return entries
  }, [discoveredUrls, pages])

  const sitemapEntryCount = sitemapEntries.length
  const sitemapErrorCount = sitemapEntries.filter(
    (entry) => entry.status === "error",
  ).length
  const hasSitemapEntries = sitemapEntryCount > 0

  const productQuickFacts = crawlerFactBase.map((entry) => ({
    label: entry.factLabel,
    value: entry.value,
    tone: entry.tone,
  }))

  const hasCrawlerNotices = Boolean(
    progressMessage ||
      profile?.errorMessage ||
      (!profile && !isRunningPipeline),
  )

  const pipelineJobState: ProductInsightPipelineJobState =
    profile?.pipelineJobState ?? "idle"

  const isPipelinePending =
    isRunningPipeline ||
    pipelineJobState === "queued" ||
    pipelineJobState === "active"

  const finalReport =
    (profile?.finalReport as ProductInsightComprehensiveReport | null) ?? null
  const headlineHighlights = Array.isArray(finalReport?.headlineHighlights)
    ? finalReport!.headlineHighlights
    : []
  const opportunityAreas = Array.isArray(finalReport?.opportunityAreas)
    ? finalReport!.opportunityAreas
    : []
  const customerSignals = Array.isArray(finalReport?.customerSignals)
    ? finalReport!.customerSignals
    : []
  const recommendedActions = Array.isArray(finalReport?.recommendedActions)
    ? finalReport!.recommendedActions
    : []
  const communityPlan = Array.isArray(finalReport?.communityPlan)
    ? finalReport!.communityPlan
    : []
  const metricsToWatch = Array.isArray(finalReport?.metricsToWatch)
    ? finalReport!.metricsToWatch
    : []
  const supportingData = Array.isArray(finalReport?.supportingData)
    ? finalReport!.supportingData
    : []
  const reportStatus = profile?.finalReportStatus ?? null
  const reportStatusDisplay = reportStatus
    ? STATUS_STYLES[reportStatus]
    : { label: "Not started", badge: "outline" as const }
  const lastReportGenerated = profile?.lastFinalReportAt
    ? formatDistanceToNowStrict(new Date(profile.lastFinalReportAt), {
        addSuffix: true,
      })
    : "Never"
  const headlineCount = headlineHighlights.length
  const actionCount = recommendedActions.length
  const opportunityCount = opportunityAreas.length
  const hasFinalReport = Boolean(finalReport)

  const communityPlanCount = communityPlan.length
  const metricsToWatchCount = metricsToWatch.length

  const reportQuickFacts: Array<{
    label: string
    value: string
    tone: MetricTone
  }> = [
    {
      label: "Last generated",
      value: lastReportGenerated,
      tone: hasFinalReport ? "neutral" : "warning",
    },
    {
      label: "Highlights",
      value: headlineCount
        ? `${COUNT_FORMATTER.format(headlineCount)} key point${headlineCount === 1 ? "" : "s"}`
        : "—",
      tone: headlineCount ? "positive" : "neutral",
    },
    {
      label: "Recommended actions",
      value: actionCount
        ? `${COUNT_FORMATTER.format(actionCount)} action${actionCount === 1 ? "" : "s"}`
        : "—",
      tone:
        actionCount >= 3
          ? "positive"
          : actionCount
            ? "neutral"
            : hasFinalReport
              ? "warning"
              : "neutral",
    },
    {
      label: "Opportunity areas",
      value: opportunityCount
        ? `${COUNT_FORMATTER.format(opportunityCount)} focus area${
            opportunityCount === 1 ? "" : "s"
          }`
        : "—",
      tone: opportunityCount
        ? "neutral"
        : hasFinalReport
          ? "warning"
          : "neutral",
    },
    {
      label: "Community plays",
      value: communityPlanCount
        ? `${COUNT_FORMATTER.format(communityPlanCount)} play${communityPlanCount === 1 ? "" : "s"}`
        : "—",
      tone: communityPlanCount
        ? "positive"
        : hasFinalReport
          ? "warning"
          : "neutral",
    },
    {
      label: "Metrics tracked",
      value: metricsToWatchCount
        ? `${COUNT_FORMATTER.format(metricsToWatchCount)}`
        : "—",
      tone: metricsToWatchCount
        ? "neutral"
        : hasFinalReport
          ? "warning"
          : "neutral",
    },
  ]

  const shouldShowReportEmptyState = !hasFinalReport && !isRunningPipeline
  const shouldSurfaceReportNotices = Boolean(
    reportProgress ||
      profile?.finalReportErrorMessage ||
      shouldShowReportEmptyState,
  )

  const snapshotMetrics = [
    {
      label: "Pages captured",
      value: profile
        ? pageCount
          ? COUNT_FORMATTER.format(pageCount)
          : "0"
        : "—",
      tone: profile ? (pageCount ? "neutral" : "warning") : "neutral",
    },
    {
      label: "Communities mapped",
      value: profile
        ? hasSubredditResults
          ? COUNT_FORMATTER.format(subreddits.length)
          : "0"
        : "—",
      tone: profile
        ? hasSubredditResults
          ? "positive"
          : "warning"
        : "neutral",
    },
    {
      label: "Live threads",
      value: profile
        ? hasDiscussionThreads
          ? COUNT_FORMATTER.format(discussionThreads.length)
          : "0"
        : "—",
      tone: profile
        ? hasDiscussionThreads
          ? "positive"
          : "warning"
        : "neutral",
    },
    {
      label: "Action items",
      value: finalReport
        ? actionCount
          ? COUNT_FORMATTER.format(actionCount)
          : "0"
        : "—",
      tone: finalReport
        ? actionCount >= 3
          ? "positive"
          : actionCount
            ? "neutral"
            : "warning"
        : "neutral",
    },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: string
    tone: MetricTone
  }>

  const statusSnapshot = [
    { label: "Crawler", value: lastCrawled },
    { label: "Communities", value: lastSubredditDiscovery },
    { label: "Conversations", value: lastDiscussionDiscovery },
    { label: "Report", value: lastReportGenerated },
  ] as const

  const sentimentDistribution = useMemo(() => {
    if (!discussionInsights?.sections?.length) return null

    const counts: Record<"positive" | "negative" | "neutral", number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
    }

    for (const section of discussionInsights.sections) {
      for (const item of section.items ?? []) {
        if (!item?.sentiment) continue
        if (item.sentiment in counts) {
          counts[item.sentiment as keyof typeof counts] += 1
        }
      }
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    if (!total) return null

    const data = (
      Object.entries(counts) as Array<[keyof typeof counts, number]>
    )
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        key,
        label: SENTIMENT_BADGE_LABEL[key],
        value,
      }))

    return { data, total }
  }, [discussionInsights])

  type SnapshotChartEntry = { key: string; label: string; value: number }
  type SnapshotChartResult = {
    type: "sentiment" | "actions"
    title: string
    description: string
    data: SnapshotChartEntry[]
    total: number
    colors: Record<string, string>
  }

  const actionPriorityDistribution = useMemo(() => {
    const actions = finalReport?.recommendedActions ?? []
    if (!actions.length) return null

    const counts: Record<ProductInsightReportActionPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
      watch: 0,
    }

    for (const action of actions) {
      counts[action.priority] += 1
    }

    const data = (
      Object.entries(counts) as Array<
        [ProductInsightReportActionPriority, number]
      >
    )
      .filter(([, value]) => value > 0)
      .map(([priority, value]) => ({
        key: priority,
        label: ACTION_PRIORITY_BADGE[priority].label,
        value,
      }))

    const mapped: SnapshotChartEntry[] = data.map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: entry.value,
    }))

    return { data: mapped, total: actions.length }
  }, [finalReport])

  const snapshotChart = useMemo(() => {
    if (sentimentDistribution) {
      const colors = Object.fromEntries(
        sentimentDistribution.data.map((entry) => [
          entry.key,
          SENTIMENT_COLORS[entry.key as keyof typeof SENTIMENT_COLORS] ??
            "var(--chart-2)",
        ]),
      )

      return {
        type: "sentiment" as const,
        title: "Sentiment mix",
        description: "How community conversations are trending right now.",
        data: sentimentDistribution.data.map((entry) => ({
          key: entry.key,
          label: entry.label,
          value: entry.value,
        })),
        total: sentimentDistribution.total,
        colors,
      } satisfies SnapshotChartResult
    }

    if (actionPriorityDistribution) {
      const colors = Object.fromEntries(
        actionPriorityDistribution.data.map((entry) => [
          entry.key,
          ACTION_PRIORITY_COLORS[
            entry.key as ProductInsightReportActionPriority
          ] ?? "var(--chart-2)",
        ]),
      )

      return {
        type: "actions" as const,
        title: "Action priority mix",
        description: "Distribution of recommended actions by urgency.",
        data: actionPriorityDistribution.data.map((entry) => ({
          key: entry.key,
          label: entry.label,
          value: entry.value,
        })),
        total: actionPriorityDistribution.total,
        colors,
      } satisfies SnapshotChartResult
    }

    return null
  }, [actionPriorityDistribution, sentimentDistribution])

  const snapshotChartConfig = useMemo<ChartConfig | null>(() => {
    if (!snapshotChart) return null
    return Object.fromEntries(
      snapshotChart.data.map((entry) => [
        entry.key,
        {
          label: entry.label,
          color: snapshotChart.colors[entry.key] ?? "var(--chart-2)",
        },
      ]),
    ) as ChartConfig
  }, [snapshotChart])

  const shouldOpenCrawlerStage = true
  const shouldOpenSubredditStage =
    hasSubredditResults ||
    !!subredditProgress ||
    !!profile?.subredditErrorMessage ||
    subredditStatus === "pending" ||
    subredditStatus === "failed"
  const shouldOpenDiscussionStage =
    hasDiscussionThreads ||
    !!discussionProgress ||
    !!profile?.redditErrorMessage ||
    discussionStatus === "pending" ||
    discussionStatus === "failed"
  const shouldOpenReportStage =
    hasFinalReport ||
    !!reportProgress ||
    !!profile?.finalReportErrorMessage ||
    reportStatus === "pending" ||
    reportStatus === "failed"

  const flowStageSummaries: FlowStageSummary[] = [
    {
      step: "Step 1",
      title: "Product foundation",
      description: "Crawl the website and summarize the core narrative.",
      status: statusDisplay,
      metrics: [
        { label: "Last crawled", value: lastCrawled },
        {
          label: "Pages",
          value: profile ? (pageCount ? `${pageCount}` : "0") : "—",
        },
      ],
    },
    {
      step: "Step 2",
      title: "Competitive landscape",
      description: "Map adjacent solutions and differentiation cues.",
      status: competitorStatusDisplay,
      metrics: [
        { label: "Last pass", value: lastCompetitorDiscovery },
        {
          label: "Competitors",
          value: profile
            ? hasCompetitorResults
              ? `${competitors.length}`
              : "0"
            : "—",
        },
      ],
    },
    {
      step: "Step 3",
      title: "Audience discovery",
      description: "Find active communities for this product space.",
      status: subredditStatusDisplay,
      metrics: [
        { label: "Last pass", value: lastSubredditDiscovery },
        {
          label: "Communities",
          value: profile
            ? hasSubredditResults
              ? `${subreddits.length}`
              : "0"
            : "—",
        },
      ],
    },
    {
      step: "Step 4",
      title: "Discussion insights",
      description: "Pull live conversations to reveal wins and friction.",
      status: discussionStatusDisplay,
      metrics: [
        { label: "Last pass", value: lastDiscussionDiscovery },
        {
          label: "Threads",
          value: profile
            ? hasDiscussionThreads
              ? `${discussionThreads.length}`
              : "0"
            : "—",
        },
      ],
    },
    {
      step: "Step 5",
      title: "Actionable report",
      description: "Synthesize everything into a focused execution plan.",
      status: reportStatusDisplay,
      metrics: [
        { label: "Last run", value: lastReportGenerated },
        {
          label: "Actions",
          value: actionCount ? `${actionCount}` : "—",
        },
      ],
    },
  ]

  const renderCrawlerEmptyState = () => {
    if (profile || isRunningPipeline) return null
    return (
      <InfoNotice tone="info">
        Run the crawler to capture a fresh profile from your live site. We will
        parse the sitemap, summarize the content, and store the highlights for
        reuse.
      </InfoNotice>
    )
  }

  const renderCrawlerProgress = () => {
    if (!progressMessage) return null
    return (
      <InfoNotice tone="info" size="xs">
        {progressMessage}
      </InfoNotice>
    )
  }

  const renderCrawlerError = () => {
    if (!profile?.errorMessage) return null
    return <InfoNotice tone="error">{profile.errorMessage}</InfoNotice>
  }

  const renderCompetitorProgress = () => {
    if (!competitorProgress) return null
    return (
      <InfoNotice tone="info" size="xs">
        {competitorProgress}
      </InfoNotice>
    )
  }

  const renderCompetitorError = () => {
    if (!profile?.competitorErrorMessage) return null
    return (
      <InfoNotice tone="error">{profile.competitorErrorMessage}</InfoNotice>
    )
  }

  const renderCompetitorEmptyState = () => {
    if (!shouldShowCompetitorEmptyState) return null
    return (
      <InfoNotice tone="info" size="xs">
        Run the pipeline to benchmark competitive alternatives and cache them
        for future research.
      </InfoNotice>
    )
  }

  const renderSubredditProgress = () => {
    if (!subredditProgress) return null
    return (
      <InfoNotice tone="info" size="xs">
        {subredditProgress}
      </InfoNotice>
    )
  }

  const renderSubredditError = () => {
    if (!profile?.subredditErrorMessage) return null
    return <InfoNotice tone="error">{profile.subredditErrorMessage}</InfoNotice>
  }

  const renderSubredditCoverageNotice = () => {
    if (!coverageNeedsAttention || coveragePercent === null) return null
    return (
      <InfoNotice tone="info" size="xs">
        Discovery matched {PERCENT_FORMATTER.format(coveragePercent)}% of the
        planned queries. Queue another pipeline run once fresh crawl data is
        available so we can push toward the 70% target.
      </InfoNotice>
    )
  }

  const renderDiscussionProgress = () => {
    if (!discussionProgress) return null
    return (
      <InfoNotice tone="info" size="xs">
        {discussionProgress}
      </InfoNotice>
    )
  }

  const renderDiscussionError = () => {
    if (!profile?.redditErrorMessage) return null
    return <InfoNotice tone="error">{profile.redditErrorMessage}</InfoNotice>
  }

  const renderReportProgress = () => {
    if (!reportProgress) return null
    return (
      <InfoNotice tone="info" size="xs">
        {reportProgress}
      </InfoNotice>
    )
  }

  const renderReportError = () => {
    if (!profile?.finalReportErrorMessage) return null
    return (
      <InfoNotice tone="error">{profile.finalReportErrorMessage}</InfoNotice>
    )
  }

  const formatActionTimeframe = (value?: string | null) => {
    if (!value) return null
    switch (value) {
      case "immediate":
        return "Immediate"
      case "near-term":
        return "Near-term"
      case "long-term":
        return "Long-term"
      default:
        return null
    }
  }

  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Run full pipeline</CardTitle>
            <CardDescription>
              Refresh the crawl, community discovery, discussion insights, and
              report in one click.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex items-start justify-between gap-3 sm:items-center sm:justify-end">
              <Label
                htmlFor={deepHarvestSwitchId}
                className="flex-1 flex-col items-start gap-1 text-left text-xs text-muted-foreground sm:items-end sm:text-right"
              >
                <span className="text-sm font-medium text-foreground">
                  Deep harvest
                </span>
                <span className="text-[11px]">
                  Expand discovery searches and pull full comment trees for top
                  threads.
                </span>
              </Label>
              <Switch
                id={deepHarvestSwitchId}
                checked={isDeepMode}
                onCheckedChange={setIsDeepMode}
                disabled={isPipelinePending}
                aria-label="Toggle deep discussion harvest"
              />
            </div>
            <Button
              onClick={handleRunPipeline}
              disabled={isPipelinePending}
              className="w-full sm:w-auto"
            >
              {isPipelinePending
                ? "Pipeline in progress…"
                : "Run full pipeline"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div>Last report generated: {lastReportGenerated}</div>
          <div>Discussion harvest: {activeHarvestModeLabel}</div>
          {pipelineNotice ? (
            <InfoNotice tone={pipelineNotice.tone} size="xs">
              {pipelineNotice.message}
            </InfoNotice>
          ) : (
            <div>
              We will email you when the latest insights are ready. Expect a
              summary with key highlights and recommended actions.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Insights snapshot</CardTitle>
          <CardDescription>
            Quick pulse across crawl coverage, audience discovery, and the
            current action plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {snapshotMetrics.map((metric) => (
                  <MetricTile
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                  />
                ))}
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {statusSnapshot.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="ml-auto text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {snapshotChart && snapshotChartConfig ? (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {snapshotChart.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {snapshotChart.description}
                    </div>
                  </div>
                  <AnalyticsPieChart
                    className="border-none p-0 shadow-none"
                    data={snapshotChart.data}
                    config={snapshotChartConfig}
                    dataKey="value"
                    nameKey="label"
                    height={220}
                    innerRadius={60}
                    pieProps={{ paddingAngle: 2 }}
                    tooltip={{
                      labelFormatter: (label) =>
                        typeof label === "string" || typeof label === "number"
                          ? String(label)
                          : "",
                      valueFormatter: (value) => {
                        const percent = snapshotChart.total
                          ? (value / snapshotChart.total) * 100
                          : 0
                        return `${COUNT_FORMATTER.format(value)} (${PERCENT_FORMATTER.format(percent)}%)`
                      },
                    }}
                    getCellProps={(entry) => ({
                      fill:
                        snapshotChart.colors[entry.key as string] ??
                        "var(--chart-2)",
                      stroke: "var(--card)",
                    })}
                  />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {snapshotChart.data.map((entry) => {
                      const percent = snapshotChart.total
                        ? (entry.value / snapshotChart.total) * 100
                        : 0
                      return (
                        <div
                          key={entry.key}
                          className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                snapshotChart.colors[entry.key] ??
                                "var(--chart-2)",
                            }}
                          />
                          <span className="flex-1 font-medium text-foreground">
                            {entry.label}
                          </span>
                          <span className="font-semibold text-foreground">
                            {COUNT_FORMATTER.format(entry.value)}
                          </span>
                          <span>({PERCENT_FORMATTER.format(percent)}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-muted-foreground">
                  Run the insights pipeline to visualise sentiment and action
                  mix at a glance.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <FlowOverview stages={flowStageSummaries} />

      <StageCard
        step="Step 1"
        title="Product foundation"
        description="The pipeline crawler captures live messaging and structure for this product."
        status={statusDisplay}
        collapsible
        defaultOpen={shouldOpenCrawlerStage}
      >
        <>
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Product
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-semibold text-foreground">
                        {productName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={statusDisplay.badge}
                          className="text-[11px]"
                        >
                          {statusDisplay.label}
                        </Badge>
                        <Link
                          href={websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10"
                        >
                          Visit live site
                        </Link>
                      </div>
                      <Link
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs text-muted-foreground hover:text-primary"
                      >
                        {websiteUrl}
                      </Link>
                    </div>
                  </div>
                  <div className="grid flex-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {productQuickFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm shadow-sm",
                          FACT_TONE_STYLES[fact.tone],
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {fact.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {profile ? (
                  pageCount ? (
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Crawler health</span>
                        <span
                          className={cn(
                            "font-semibold",
                            METRIC_TONE_STYLES[crawlerHealthTone],
                          )}
                        >
                          {crawlerHealthPercent}% success
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            METRIC_TONE_BAR[crawlerHealthTone],
                          )}
                          style={{ width: `${crawlerHealthPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {COUNT_FORMATTER.format(successfulPages)} ok
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            erroredPages.length
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {COUNT_FORMATTER.format(erroredPages.length)} errors
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                      We captured the profile metadata but no crawlable pages.
                      Check that the sitemap is reachable and rerun the crawler.
                    </div>
                  )
                ) : null}
                {hasCrawlerNotices ? (
                  <div className="mt-5 space-y-2">
                    {renderCrawlerProgress()}
                    {renderCrawlerError()}
                    {renderCrawlerEmptyState()}
                  </div>
                ) : null}

                <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Sitemap sources
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Live URLs captured during the last crawl.
                      </div>
                    </div>
                    <Badge
                      variant={
                        hasSitemapEntries
                          ? sitemapErrorCount
                            ? "destructive"
                            : "secondary"
                          : "outline"
                      }
                      className="text-[11px]"
                    >
                      {hasSitemapEntries
                        ? sitemapErrorCount
                          ? `${COUNT_FORMATTER.format(sitemapEntryCount)} URL${sitemapEntryCount === 1 ? "" : "s"} • ${COUNT_FORMATTER.format(sitemapErrorCount)} error${sitemapErrorCount === 1 ? "" : "s"}`
                          : `${COUNT_FORMATTER.format(sitemapEntryCount)} URL${sitemapEntryCount === 1 ? "" : "s"}`
                        : "None yet"}
                    </Badge>
                  </div>

                  {hasSitemapEntries ? (
                    <>
                      {sitemapErrorCount ? (
                        <InfoNotice tone="error" size="xs">
                          {sitemapErrorCount === 1
                            ? "1 URL returned an error during the last crawl."
                            : `${COUNT_FORMATTER.format(sitemapErrorCount)} URLs returned errors during the last crawl.`}
                        </InfoNotice>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-2">
                        {sitemapEntries.map((entry) => (
                          <Link
                            key={entry.url}
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "group flex items-start gap-2 rounded-md border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                              SITEMAP_ITEM_STYLES[entry.status],
                            )}
                          >
                            <span
                              className={cn(
                                "mt-1 h-2 w-2 flex-shrink-0 rounded-full",
                                SITEMAP_INDICATOR_STYLES[entry.status],
                              )}
                            />
                            <span className="break-all leading-relaxed">
                              {entry.url}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                      Run the crawler to capture sitemap URLs for this product.
                    </div>
                  )}
                </div>
              </section>
              <div className="space-y-6">
                {profile && !isRunningPipeline && !summary ? (
                  <InfoNotice tone="info" size="xs">
                    We captured the crawl but did not synthesize a summary yet.
                    Run the full pipeline again if you recently updated the
                    product site.
                  </InfoNotice>
                ) : null}

                {summary ? (
                  <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Product narrative
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Condensed from live website content and structured
                          metadata.
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="self-start text-[11px]"
                      >
                        {summarySections.length
                          ? `${summarySections.length} theme${summarySections.length === 1 ? "" : "s"}`
                          : "Overview"}
                      </Badge>
                    </div>
                    {summary.overview ? (
                      <blockquote className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        {summary.overview}
                      </blockquote>
                    ) : null}
                    {!!summarySections.length && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {summarySections.map((section) => (
                          <div
                            key={section.title}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground">
                                {section.title}
                              </div>
                              <Badge variant="outline" className="text-[11px]">
                                {COUNT_FORMATTER.format(section.items.length)}
                              </Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {section.items.map((item, index) => (
                                <li
                                  key={`${section.title}-${index}`}
                                  className="flex gap-2"
                                >
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </>
      </StageCard>

      <StageCard
        step="Step 2"
        title="Competitive landscape"
        description="Identify the alternatives buyers evaluate alongside this product before diving into community signals."
        status={competitorStatusDisplay}
        collapsible
        defaultOpen={shouldOpenCompetitorStage}
      >
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Competitive snapshot
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Direct and adjacent products highlighted from the crawl and
                    synthesis context.
                  </div>
                </div>
                {competitorModel ? (
                  <Badge variant="outline" className="self-start text-[11px]">
                    {competitorModel}
                  </Badge>
                ) : null}
              </div>

              {shouldSurfaceCompetitorNotices ? (
                <div className="space-y-2">
                  {renderCompetitorProgress()}
                  {renderCompetitorError()}
                  {renderCompetitorEmptyState()}
                </div>
              ) : null}

              {hasCompetitorResults ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedCompetitors.map((competitor, index) => {
                    const differentiators = Array.isArray(
                      competitor.differentiators,
                    )
                      ? competitor.differentiators.filter(
                          (item): item is string =>
                            typeof item === "string" && item.trim().length > 0,
                        )
                      : []
                    const strengths = Array.isArray(competitor.strengths)
                      ? competitor.strengths.filter(
                          (item): item is string =>
                            typeof item === "string" && item.trim().length > 0,
                        )
                      : []
                    const weaknesses = Array.isArray(competitor.weaknesses)
                      ? competitor.weaknesses.filter(
                          (item): item is string =>
                            typeof item === "string" && item.trim().length > 0,
                        )
                      : []
                    const similarityPercent =
                      typeof competitor.similarityScore === "number"
                        ? Math.round(competitor.similarityScore * 100)
                        : null
                    const maturityLabel = competitor.maturity
                      ? competitor.maturity.charAt(0).toUpperCase() +
                        competitor.maturity.slice(1)
                      : null
                    const focusArea = competitor.focusArea?.trim() || null
                    const positioning = competitor.positioning?.trim() || null
                    const source = competitor.source?.trim() || null
                    const visitUrl = competitor.url ?? null

                    return (
                      <div
                        key={`${competitor.name || "competitor"}-${index}`}
                        className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              {competitor.name || "Competitor"}
                            </div>
                            {focusArea ? (
                              <div className="text-xs text-muted-foreground">
                                {focusArea}
                              </div>
                            ) : null}
                            {positioning ? (
                              <div className="text-xs text-muted-foreground">
                                {positioning}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {similarityPercent !== null ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {similarityPercent}% overlap
                              </Badge>
                            ) : null}
                            {maturityLabel ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {maturityLabel}
                              </Badge>
                            ) : null}
                            {visitUrl ? (
                              <Link
                                href={visitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-primary transition hover:underline"
                              >
                                Visit site
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        {competitor.description ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {competitor.description}
                          </p>
                        ) : null}
                        <div className="space-y-3 text-xs text-muted-foreground">
                          {differentiators.length ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Differentiators
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {differentiators.map((item) => (
                                  <span
                                    key={`${competitor.name}-diff-${item}`}
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {strengths.length ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Strengths
                              </div>
                              <ul className="mt-1 space-y-1">
                                {strengths.map((item) => (
                                  <li
                                    key={`${competitor.name}-strength-${item}`}
                                    className="leading-relaxed"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {weaknesses.length ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Gaps
                              </div>
                              <ul className="mt-1 space-y-1">
                                {weaknesses.map((item) => (
                                  <li
                                    key={`${competitor.name}-weakness-${item}`}
                                    className="leading-relaxed"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {source ? (
                            <div className="text-[11px] text-muted-foreground">
                              Source: {source}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {competitorResearchNotes.length ? (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-foreground">
                    Analyst notes
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                    {competitorResearchNotes.map((note, index) => (
                      <li
                        key={`${index}-${note.slice(0, 24)}`}
                        className="flex gap-2"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </>
      </StageCard>

      <StageCard
        step="Step 3"
        title="Audience discovery"
        description="The pipeline generates community search plans and captures the groups that match this product."
        status={subredditStatusDisplay}
        collapsible
        defaultOpen={shouldOpenSubredditStage}
      >
        <>
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        Search plan
                      </div>
                      {subredditQueries.length ? (
                        <Badge variant="outline" className="text-[11px]">
                          {COUNT_FORMATTER.format(subredditQueries.length)} quer
                          {subredditQueries.length === 1 ? "y" : "ies"}
                        </Badge>
                      ) : null}
                    </div>
                    {subredditQueries.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {subredditQueries.map((item) => {
                          const matchCount =
                            communityStats.queryMatchCounts.get(item.query) ?? 0
                          return (
                            <div
                              key={item.query}
                              className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold leading-snug text-foreground">
                                  {item.query}
                                </div>
                                <Badge
                                  variant={matchCount ? "secondary" : "outline"}
                                  className="text-[10px]"
                                >
                                  {matchCount
                                    ? `${matchCount} match${matchCount === 1 ? "" : "es"}`
                                    : "No matches yet"}
                                </Badge>
                              </div>
                              {item.rationale ? (
                                <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                  {item.rationale}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted-foreground">
                        Run discovery to generate targeted community search
                        queries for this product.
                      </div>
                    )}
                  </div>
                  {topSubreddits.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          Priority communities
                        </div>
                        <Badge variant="secondary" className="text-[11px]">
                          Top {topSubreddits.length}
                        </Badge>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {topSubreddits.map((subreddit) => {
                          const relevancePercent =
                            typeof subreddit.relevanceScore === "number"
                              ? Math.round(subreddit.relevanceScore * 100)
                              : null
                          const memberCount =
                            typeof subreddit.subscribers === "number"
                              ? COUNT_FORMATTER.format(subreddit.subscribers)
                              : null
                          const description =
                            subreddit.relevanceReason ||
                            subreddit.description ||
                            subreddit.title ||
                            null
                          const trimmedDescription =
                            description && description.length > 140
                              ? `${description.slice(0, 140)}…`
                              : description
                          const queryBadgeLabel = subreddit.matchedQueries
                            ?.length
                            ? `${subreddit.matchedQueries.length} query${
                                subreddit.matchedQueries.length === 1
                                  ? ""
                                  : "es"
                              }`
                            : null
                          return (
                            <Link
                              key={subreddit.name}
                              href={
                                subreddit.url ??
                                `https://reddit.com/r/${subreddit.name}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="group rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-semibold text-foreground">
                                  r/{subreddit.name}
                                </div>
                                {relevancePercent !== null ? (
                                  <Badge
                                    variant={
                                      relevancePercent >= 70
                                        ? "secondary"
                                        : relevancePercent >= 40
                                          ? "outline"
                                          : "destructive"
                                    }
                                    className="text-[10px]"
                                  >
                                    {relevancePercent}% match
                                  </Badge>
                                ) : null}
                              </div>
                              {trimmedDescription ? (
                                <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                  {trimmedDescription}
                                </div>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {memberCount ? (
                                  <span className="font-medium text-foreground">
                                    {memberCount} members
                                  </span>
                                ) : null}
                                {queryBadgeLabel ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {queryBadgeLabel}
                                  </Badge>
                                ) : null}
                                {subreddit.over18 ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] uppercase"
                                  >
                                    18+
                                  </Badge>
                                ) : null}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Discovery health
                    </div>
                    {hasSubredditResults ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {COUNT_FORMATTER.format(subreddits.length)} saved
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    {discoveryQuickFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm shadow-sm",
                          FACT_TONE_STYLES[fact.tone],
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {fact.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {shouldSurfaceSubredditNotices ? (
                    <div className="space-y-2">
                      {renderSubredditProgress()}
                      {renderSubredditError()}
                      {renderSubredditCoverageNotice()}
                      {shouldShowSubredditEmptyState ? (
                        <InfoNotice tone="info" size="xs">
                          Run the full pipeline to craft community search plans,
                          resolve the best-fit groups, and cache them for future
                          research or outreach.
                        </InfoNotice>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
            {hasSubredditResults ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Saved communities roster
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Full detail on reach, match rationale, and the queries
                      that drove discovery.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(subreddits.length)} community
                    {subreddits.length === 1 ? "" : "ies"}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">
                          Subreddit
                        </TableHead>
                        <TableHead className="min-w-[280px]">
                          What they discuss
                        </TableHead>
                        <TableHead>Relevance</TableHead>
                        <TableHead>Subscribers</TableHead>
                        <TableHead>Matched queries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subreddits.map((subreddit) => (
                        <TableRow key={subreddit.name}>
                          <TableCell className="whitespace-nowrap">
                            <Link
                              href={
                                subreddit.url ??
                                `https://reddit.com/r/${subreddit.name}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary hover:underline"
                            >
                              r/{subreddit.name}
                            </Link>
                            {subreddit.over18 && (
                              <Badge
                                variant="outline"
                                className="ml-2 align-middle text-[10px]"
                              >
                                18+
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                            <div>
                              {subreddit.description || subreddit.title || "—"}
                            </div>
                            {subreddit.relevanceReason && (
                              <div className="mt-2 text-xs text-primary">
                                {subreddit.relevanceReason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-foreground">
                            {typeof subreddit.relevanceScore === "number"
                              ? `${Math.round(subreddit.relevanceScore * 100)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-foreground">
                            {typeof subreddit.subscribers === "number"
                              ? subreddit.subscribers.toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-xs text-muted-foreground">
                            {subreddit.matchedQueries?.length
                              ? subreddit.matchedQueries.join(" • ")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>
                      {`${subreddits.length} subreddit${subreddits.length === 1 ? "" : "s"} saved for this product`}
                    </TableCaption>
                  </Table>
                </div>
              </section>
            ) : null}
          </div>
        </>
      </StageCard>
      <StageCard
        step="Step 4"
        title="Discussion insights"
        description="Review community conversations to surface wins, friction, and opportunities."
        status={discussionStatusDisplay}
        collapsible
        defaultOpen={shouldOpenDiscussionStage}
      >
        <>
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        Discussion queries
                      </div>
                      {discussionQueries.length ? (
                        <Badge variant="outline" className="text-[11px]">
                          {COUNT_FORMATTER.format(discussionQueries.length)}{" "}
                          quer
                          {discussionQueries.length === 1 ? "y" : "ies"}
                        </Badge>
                      ) : null}
                    </div>
                    {discussionQueries.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {discussionQueries.map((query) => (
                          <div
                            key={query.query}
                            className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
                          >
                            <div className="font-semibold leading-snug text-foreground">
                              {query.query}
                            </div>
                            {query.rationale ? (
                              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {query.rationale}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted-foreground">
                        Run the pipeline to craft discussion queries that
                        capture fresh sentiment from your saved communities.
                      </div>
                    )}
                  </div>

                  {discussionInsights ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          Focus themes
                        </div>
                        {focusAreas.length ? (
                          <Badge variant="secondary" className="text-[11px]">
                            {COUNT_FORMATTER.format(focusAreas.length)} theme
                            {focusAreas.length === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                      </div>
                      {focusAreas.length ? (
                        <div className="flex flex-wrap gap-2">
                          {focusAreas.map((item, index) => (
                            <Badge
                              key={`focus-${index}`}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <InfoNotice tone="info" size="xs">
                          No focus areas yet—rerun the analysis after the next
                          pipeline cycle to capture more community signals.
                        </InfoNotice>
                      )}
                    </div>
                  ) : null}

                  {discussionInsights ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          Signal highlights
                        </div>
                        {totalSignals ? (
                          <Badge variant="outline" className="text-[11px]">
                            {COUNT_FORMATTER.format(totalSignals)} signal
                            {totalSignals === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                      </div>
                      {topDiscussionSignals.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {topDiscussionSignals.map((signal) => {
                            const sentimentLabel = signal.sentiment
                              ? SENTIMENT_BADGE_LABEL[signal.sentiment]
                              : null
                            const sentimentVariant = signal.sentiment
                              ? SENTIMENT_BADGE_VARIANT[signal.sentiment]
                              : null
                            return (
                              <div
                                key={signal.id}
                                className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-semibold leading-snug text-foreground">
                                    {signal.insight}
                                  </div>
                                  {sentimentVariant && sentimentLabel ? (
                                    <Badge
                                      variant={sentimentVariant}
                                      className="text-[11px]"
                                    >
                                      {sentimentLabel}
                                    </Badge>
                                  ) : null}
                                </div>
                                {signal.sectionTitle ? (
                                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    From {signal.sectionTitle}
                                  </div>
                                ) : null}
                                {signal.audience ? (
                                  <div className="text-xs text-primary">
                                    Audience: {signal.audience}
                                  </div>
                                ) : null}
                                {signal.primaryEvidence ? (
                                  <blockquote className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-muted-foreground">
                                    “{signal.primaryEvidence}”
                                  </blockquote>
                                ) : null}
                                <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>
                                    {signal.evidenceCount} evidence
                                    {signal.evidenceCount === 1 ? "" : "s"}
                                  </span>
                                  {signal.references ? (
                                    <span>
                                      References:{" "}
                                      {signal.references.join(" • ")}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <InfoNotice tone="info" size="xs">
                          We did not identify specific insight sections from the
                          sampled threads yet. Rerun the analysis once the
                          crawler has fresh data to expand coverage.
                        </InfoNotice>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Insight health
                    </div>
                    {hasDiscussionThreads ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {COUNT_FORMATTER.format(discussionThreads.length)}{" "}
                        thread
                        {discussionThreads.length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    {discussionQuickFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm shadow-sm",
                          FACT_TONE_STYLES[fact.tone],
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {fact.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {sentimentTotal ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                        <span>Sentiment mix</span>
                        <span className="text-muted-foreground">
                          {COUNT_FORMATTER.format(totalSignals)} signal
                          {totalSignals === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white">
                        {(["positive", "neutral", "negative"] as const).map(
                          (key) => {
                            const value = sentimentCounts[key]
                            if (!value) return null
                            const percent = (value / sentimentTotal) * 100
                            return (
                              <div
                                key={key}
                                className="h-full"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: SENTIMENT_COLORS[key],
                                }}
                              />
                            )
                          },
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: SENTIMENT_COLORS.positive,
                            }}
                          />
                          {COUNT_FORMATTER.format(sentimentCounts.positive)}{" "}
                          positive
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: SENTIMENT_COLORS.neutral,
                            }}
                          />
                          {COUNT_FORMATTER.format(sentimentCounts.neutral)}{" "}
                          neutral
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: SENTIMENT_COLORS.negative,
                            }}
                          />
                          {COUNT_FORMATTER.format(sentimentCounts.negative)}{" "}
                          negative
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {shouldSurfaceDiscussionNotices ? (
                    <div className="space-y-2">
                      {renderDiscussionProgress()}
                      {renderDiscussionError()}
                      {shouldShowDiscussionEmptyState ? (
                        <InfoNotice tone="info" size="xs">
                          Run the pipeline to sample the latest conversations
                          from your saved communities.
                        </InfoNotice>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {discussionSections.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Insight clusters
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Automatically grouped clusters summarizing what the
                      community is talking about right now.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(discussionSections.length)} cluster
                    {discussionSections.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {discussionSections.map((section, sectionIndex) => {
                    const sectionItems = Array.isArray(section?.items)
                      ? section.items
                      : []
                    return (
                      <div
                        key={`cluster-${sectionIndex}-${section?.title ?? "untitled"}`}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-foreground">
                            {section?.title ?? `Cluster ${sectionIndex + 1}`}
                          </div>
                          {sectionItems.length ? (
                            <Badge variant="outline" className="text-[11px]">
                              {COUNT_FORMATTER.format(sectionItems.length)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          {sectionItems.length ? (
                            sectionItems.map((item, itemIndex) => {
                              const hasSentiment =
                                item?.sentiment === "positive" ||
                                item?.sentiment === "negative" ||
                                item?.sentiment === "neutral"
                              const sentimentKey = hasSentiment
                                ? (item.sentiment as
                                    | "positive"
                                    | "negative"
                                    | "neutral")
                                : null
                              const sentimentVariant = sentimentKey
                                ? SENTIMENT_BADGE_VARIANT[sentimentKey]
                                : null
                              const sentimentLabel = sentimentKey
                                ? SENTIMENT_BADGE_LABEL[sentimentKey]
                                : null
                              return (
                                <div
                                  key={`cluster-${sectionIndex}-${itemIndex}`}
                                  className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm font-medium text-foreground">
                                      {item?.insight ?? "Insight"}
                                    </div>
                                    {sentimentVariant && sentimentLabel ? (
                                      <Badge
                                        variant={sentimentVariant}
                                        className="text-[11px]"
                                      >
                                        {sentimentLabel}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {item?.audience ? (
                                    <div className="text-xs text-primary">
                                      Audience: {item.audience}
                                    </div>
                                  ) : null}
                                  {Array.isArray(item?.evidence) &&
                                  item.evidence.length ? (
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                      {item.evidence.map(
                                        (evidence, evidenceIndex) => (
                                          <li
                                            key={`cluster-${sectionIndex}-${itemIndex}-evidence-${evidenceIndex}`}
                                          >
                                            {evidence}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  ) : null}
                                  {Array.isArray(item?.references) &&
                                  item.references.length ? (
                                    <div className="text-[11px] text-muted-foreground">
                                      References: {item.references.join(", ")}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })
                          ) : (
                            <InfoNotice tone="info" size="xs">
                              No individual signals captured for this cluster
                              yet.
                            </InfoNotice>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {hasDiscussionThreads ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Sampled discussions
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Latest discussion threads captured for this run with top
                      comment highlights.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(discussionThreads.length)} thread
                    {discussionThreads.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[240px]">
                          Discussion
                        </TableHead>
                        <TableHead>Community</TableHead>
                        <TableHead className="min-w-[140px]">Signals</TableHead>
                        <TableHead className="min-w-[180px]">
                          Matched queries
                        </TableHead>
                        <TableHead className="min-w-[260px]">
                          Top insight
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discussionThreads.map((thread) => {
                        const topComment = thread.topComments?.[0] ?? null
                        const additionalComments = Math.max(
                          (thread.topComments?.length ?? 0) - 1,
                          0,
                        )
                        const preview = topComment?.body
                          ? topComment.body.length > 200
                            ? `${topComment.body.slice(0, 200)}…`
                            : topComment.body
                          : null
                        const relativeCreated = thread.createdAt
                          ? formatDistanceToNowStrict(
                              new Date(thread.createdAt),
                              {
                                addSuffix: true,
                              },
                            )
                          : null
                        return (
                          <TableRow key={thread.id}>
                            <TableCell className="whitespace-normal break-words text-sm text-foreground">
                              <Link
                                href={thread.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                {thread.title}
                              </Link>
                              {thread.flairText ? (
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {thread.flairText}
                                </div>
                              ) : null}
                              {relativeCreated ? (
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {relativeCreated}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-primary">
                              r/{thread.subreddit}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground">
                              <div>
                                {typeof thread.score === "number"
                                  ? `${thread.score.toLocaleString()} upvotes`
                                  : "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {typeof thread.numComments === "number"
                                  ? `${thread.numComments} comments`
                                  : ""}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-normal break-words text-xs text-muted-foreground">
                              {thread.matchedQueries?.length
                                ? thread.matchedQueries.join(" • ")
                                : "—"}
                            </TableCell>
                            <TableCell className="whitespace-normal break-words text-xs text-muted-foreground">
                              {preview ? (
                                <div className="space-y-1">
                                  <div>“{preview}”</div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                    {topComment?.author ? (
                                      <span>by {topComment.author}</span>
                                    ) : null}
                                    {typeof topComment?.score === "number" ? (
                                      <span>{topComment.score} upvotes</span>
                                    ) : null}
                                    {additionalComments > 0 ? (
                                      <span>+{additionalComments} more</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ) : null}
          </div>
        </>
      </StageCard>

      <StageCard
        step="Step 5"
        title="Comprehensive report"
        description="Merge product narrative, community intelligence, and discussion signals into a single plan."
        status={reportStatusDisplay}
        collapsible
        defaultOpen={shouldOpenReportStage}
      >
        <>
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        Executive summary
                      </div>
                      {headlineCount ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {COUNT_FORMATTER.format(headlineCount)} highlight
                          {headlineCount === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </div>
                    {finalReport?.executiveSummary ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        {finalReport.executiveSummary}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-muted-foreground">
                        Generate the comprehensive report to summarize product
                        positioning and surfaced opportunities.
                      </div>
                    )}
                  </div>

                  {headlineHighlights.length ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Headline highlights
                      </div>
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {headlineHighlights.map((highlight, index) => (
                          <li key={`headline-${index}`}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {recommendedActions.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          Priority snapshot
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          {COUNT_FORMATTER.format(actionCount)} action
                          {actionCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {recommendedActions.slice(0, 2).map((action, index) => {
                          const priority =
                            ACTION_PRIORITY_BADGE[action.priority]
                          const timeframeLabel = formatActionTimeframe(
                            action.timeframe,
                          )
                          const trimmedDescription =
                            action.description &&
                            action.description.length > 200
                              ? `${action.description.slice(0, 200)}…`
                              : action.description || null
                          return (
                            <div
                              key={`action-highlight-${index}`}
                              className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold text-foreground">
                                    {action.title}
                                  </div>
                                  {timeframeLabel ? (
                                    <div className="text-xs text-primary">
                                      {timeframeLabel}
                                    </div>
                                  ) : null}
                                </div>
                                {priority ? (
                                  <Badge
                                    variant={priority.badge}
                                    className="text-[11px]"
                                  >
                                    {priority.label}
                                  </Badge>
                                ) : null}
                              </div>
                              {trimmedDescription ? (
                                <div className="text-sm leading-relaxed text-muted-foreground">
                                  {trimmedDescription}
                                </div>
                              ) : null}
                              {action.successMetric ? (
                                <div className="mt-auto text-[11px] text-muted-foreground">
                                  Success metric: {action.successMetric}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                      {actionCount > 2 ? (
                        <div className="text-[11px] text-muted-foreground">
                          {COUNT_FORMATTER.format(actionCount - 2)} more action
                          {actionCount - 2 === 1 ? "" : "s"} listed below
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Report health
                    </div>
                    <Badge
                      variant={reportStatusDisplay.badge}
                      className="text-[11px]"
                    >
                      {reportStatusDisplay.label}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {reportQuickFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm shadow-sm",
                          FACT_TONE_STYLES[fact.tone],
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {fact.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {shouldSurfaceReportNotices ? (
                    <div className="space-y-2">
                      {renderReportProgress()}
                      {renderReportError()}
                      {shouldShowReportEmptyState ? (
                        <InfoNotice tone="info" size="xs">
                          Run the pipeline after the crawler, audience, and
                          discussion stages finish to generate the comprehensive
                          plan.
                        </InfoNotice>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {opportunityAreas.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Opportunity areas
                    </div>
                    <div className="text-xs text-muted-foreground">
                      The biggest positioning gaps and growth angles from the
                      synthesized report.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(opportunityAreas.length)} area
                    {opportunityAreas.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {opportunityAreas.map((area, index) => (
                    <div
                      key={`opportunity-${index}`}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                    >
                      <div className="text-sm font-semibold text-foreground">
                        {area.title}
                      </div>
                      {area.summary ? (
                        <div className="text-sm text-muted-foreground">
                          {area.summary}
                        </div>
                      ) : null}
                      {Array.isArray(area.highlights) &&
                      area.highlights.length ? (
                        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {area.highlights.map((item, itemIndex) => (
                            <li key={`opportunity-${index}-${itemIndex}`}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {customerSignals.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Customer signals
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Synthesized evidence from discussions, testimonials, and
                      product reviews.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(customerSignals.length)} section
                    {customerSignals.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {customerSignals.map((section, index) => (
                    <div
                      key={`signal-${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="text-sm font-semibold text-foreground">
                        {section.title}
                      </div>
                      {section.summary ? (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {section.summary}
                        </div>
                      ) : null}
                      {Array.isArray(section.highlights) &&
                      section.highlights.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {section.highlights.map((item, itemIndex) => (
                            <li key={`signal-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {recommendedActions.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Recommended actions
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Prioritized experiments and follow-ups grounded in the
                      captured signals.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(recommendedActions.length)} action
                    {recommendedActions.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {recommendedActions.map((action, index) => {
                    const priority = ACTION_PRIORITY_BADGE[action.priority]
                    const timeframeLabel = formatActionTimeframe(
                      action.timeframe,
                    )
                    return (
                      <div
                        key={`action-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              {action.title}
                            </div>
                            {timeframeLabel ? (
                              <div className="text-xs text-primary">
                                {timeframeLabel}
                              </div>
                            ) : null}
                          </div>
                          {priority ? (
                            <Badge
                              variant={priority.badge}
                              className="text-[11px]"
                            >
                              {priority.label}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {action.description}
                        </div>
                        {action.rationale ? (
                          <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-muted-foreground">
                            <div className="font-medium text-foreground">
                              Why this matters
                            </div>
                            <div className="mt-1 leading-relaxed">
                              {action.rationale}
                            </div>
                          </div>
                        ) : null}
                        {action.successMetric ? (
                          <div className="mt-2 text-[11px] text-primary">
                            Success metric: {action.successMetric}
                          </div>
                        ) : null}
                        {Array.isArray(action.supportingSignals) &&
                        action.supportingSignals.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {action.supportingSignals.map(
                              (signal, signalIndex) => (
                                <li key={`action-${index}-${signalIndex}`}>
                                  {signal}
                                </li>
                              ),
                            )}
                          </ul>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {communityPlan.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Community plan
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Outreach objectives tailored to the subreddits uncovered
                      earlier in the pipeline.
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start text-[11px]">
                    {COUNT_FORMATTER.format(communityPlan.length)} objective
                    {communityPlan.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {communityPlan.map((plan, index) => (
                    <div
                      key={`community-${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">
                          {plan.objective}
                        </div>
                        {plan.successSignal ? (
                          <Badge variant="secondary" className="text-[11px]">
                            Success signal: {plan.successSignal}
                          </Badge>
                        ) : null}
                      </div>
                      {Array.isArray(plan.targetSubreddits) &&
                      plan.targetSubreddits.length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Target communities:{" "}
                          {plan.targetSubreddits.join(" • ")}
                        </div>
                      ) : null}
                      {Array.isArray(plan.tactics) && plan.tactics.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {plan.tactics.map((tactic, tacticIndex) => (
                            <li key={`community-${index}-${tacticIndex}`}>
                              {tactic}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {metricsToWatch.length ? (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">
                    Metrics to watch
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {COUNT_FORMATTER.format(metricsToWatch.length)} metric
                    {metricsToWatch.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {metricsToWatch.map((metric, index) => (
                    <li key={`metric-${index}`}>{metric}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {supportingData.length ? (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">
                    Supporting data
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {COUNT_FORMATTER.format(supportingData.length)} dataset
                    {supportingData.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {supportingData.map((entry, index) => (
                    <div
                      key={`support-${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-muted-foreground"
                    >
                      <div className="text-sm font-semibold text-foreground">
                        {entry.label}
                      </div>
                      {Array.isArray(entry.entries) && entry.entries.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {entry.entries.map((item, itemIndex) => (
                            <li key={`support-${index}-${itemIndex}`}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      </StageCard>
    </div>
  )
}
