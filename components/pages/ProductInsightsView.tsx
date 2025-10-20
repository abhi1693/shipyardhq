"use client"

import {
  useCallback,
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

import { scheduleAdminProductInsightsPipeline } from "@/actions/admin/products/insights"
import {
  scheduleProductInsightsPipeline,
  type SchedulePipelineOptions,
  type SchedulePipelineResult,
} from "@/actions/member/products/insights"
import type {
  ProductInsightComprehensiveReport,
  ProductInsightHackerNewsQuery,
  ProductInsightHackerNewsStory,
  ProductInsightHackerNewsSummary,
  ProductInsightPipelineJobState,
  ProductInsightRedditDiscussionQuery,
  ProductInsightRedditInsightReport,
  ProductInsightRedditThread,
  ProductInsightReportAction,
  ProductInsightReportActionPriority,
  ProductInsightProductHuntLaunch,
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
import { formatInsightsUsage } from "@/lib/productInsights/insightsUsage"
import AnalyticsFeedbackPrompt from "@/components/molecules/AnalyticsFeedbackPrompt"

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

type SentimentKey = "positive" | "negative" | "neutral"

function isSentimentKey(value: unknown): value is SentimentKey {
  return value === "positive" || value === "negative" || value === "neutral"
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

const ACTION_PRIORITY_ICON: Record<ProductInsightReportActionPriority, string> =
  {
    high: "🔥",
    medium: "⚡",
    low: "📌",
    watch: "👀",
  }

const ACTION_PRIORITY_ORDER: Record<
  ProductInsightReportActionPriority,
  number
> = {
  high: 0,
  medium: 1,
  low: 2,
  watch: 3,
}

const ACTION_TIMEFRAME_ORDER: Record<
  NonNullable<ProductInsightReportAction["timeframe"]>,
  number
> = {
  immediate: 0,
  "near-term": 1,
  "long-term": 2,
}

const ACTION_TIMEFRAME_LABEL: Record<
  NonNullable<ProductInsightReportAction["timeframe"]>,
  string
> = {
  immediate: "Immediate",
  "near-term": "Next sprint",
  "long-term": "Long-term",
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
  accessLevel?: "member" | "admin"
}

type SummarySection = {
  title: string
  items: string[]
  headline?: string
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
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex flex-col gap-6"
      >
        {header(true)}
        <CollapsibleContent asChild>
          <CardContent className="space-y-6">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function ProductInsightsView({
  slug,
  productName,
  websiteUrl,
  initialProfile,
  accessLevel = "member",
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
  const [hackerNewsProgress, setHackerNewsProgress] = useState<string | null>(
    null,
  )
  const [reportProgress, setReportProgress] = useState<string | null>(null)
  const [pipelineNotice, setPipelineNotice] = useState<{
    tone: "info" | "error"
    message: string
  } | null>(null)
  const [isRunningPipeline, startPipelineTransition] = useTransition()
  const [isDeepMode, setIsDeepMode] = useState(true)
  const [showCompetitorDeepDive, setShowCompetitorDeepDive] = useState(false)
  const [showCommunityDeepDive, setShowCommunityDeepDive] = useState(false)
  const [showCommunityInputs, setShowCommunityInputs] = useState(false)
  const [showProductHuntInputs, setShowProductHuntInputs] = useState(false)
  const [showHackerNewsInputs, setShowHackerNewsInputs] = useState(false)
  const [showHackerNewsDeepDive, setShowHackerNewsDeepDive] = useState(false)
  const [showDiscussionInputs, setShowDiscussionInputs] = useState(false)
  const [showDiscussionDeepDive, setShowDiscussionDeepDive] = useState(false)
  const [showReportDeepDive, setShowReportDeepDive] = useState(false)
  const recommendedActionsRef = useRef<HTMLDivElement | null>(null)

  const isAdminView = accessLevel === "admin"

  const requestPipeline = useCallback(
    (options: SchedulePipelineOptions): Promise<SchedulePipelineResult> => {
      if (isAdminView) {
        return scheduleAdminProductInsightsPipeline(slug, options)
      }
      return scheduleProductInsightsPipeline(slug, options)
    },
    [isAdminView, slug],
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
    setPipelineNotice(null)
    setProgressMessage(null)
    setCompetitorProgress(null)
    setSubredditProgress(null)
    setDiscussionProgress(null)
    setHackerNewsProgress(null)
    setReportProgress(null)

    startPipelineTransition(async () => {
      try {
        const result = await requestPipeline({
          discussionsMode: selectedHarvestMode,
        })

        if (result.throttled) {
          const { reason, nextAllowedAt, policy } = result.throttled
          let message: string

          if (reason === "missing_feature") {
            message =
              "Your current plan does not include Product Insights runs. Upgrade to unlock additional refreshes."
          } else {
            const formattedWindow = nextAllowedAt
              ? formatDistanceToNowStrict(new Date(nextAllowedAt), {
                  addSuffix: true,
                })
              : "later"
            const limitLabel =
              policy?.usageLimit && policy.usageInterval
                ? formatInsightsUsage({
                    usageLimit: policy.usageLimit,
                    usageInterval: policy.usageInterval,
                  }).toLowerCase()
                : "current"
            message = `You've reached the ${limitLabel} limit for insights runs. Try again ${formattedWindow}.`
          }

          setPipelineNotice({ tone: "error", message })
          setProfile((prev) => (result.profile ? { ...result.profile } : prev))
          toast.error(message)
          return
        }

        setPipelineNotice({
          tone: "info",
          message:
            "Running the full insights pipeline. We will email you once everything is ready.",
        })
        setProgressMessage("Starting crawl and synthesis…")
        setCompetitorProgress("Mapping competitive landscape…")
        setSubredditProgress("Preparing community discovery…")
        setDiscussionProgress("Queued for discussion analysis…")
        setHackerNewsProgress("Queued for Hacker News monitoring…")
        setReportProgress("Queued for comprehensive report…")

        setProfile((prev) => {
          if (!prev) return prev

          const stages = [
            { statusKey: "status", errorKey: "errorMessage" },
            {
              statusKey: "competitorStatus",
              errorKey: "competitorErrorMessage",
            },
            { statusKey: "subredditStatus", errorKey: "subredditErrorMessage" },
            { statusKey: "redditStatus", errorKey: "redditErrorMessage" },
            {
              statusKey: "hackerNewsStatus",
              errorKey: "hackerNewsErrorMessage",
            },
            {
              statusKey: "finalReportStatus",
              errorKey: "finalReportErrorMessage",
            },
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
              updated[statusKey] = "pending"
              updated[errorKey] = null
            }
          })

          return updated
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
          setHackerNewsProgress("Hacker News mentions refreshed.")
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
          setHackerNewsProgress(
            "Hacker News monitoring will kick off after discussions finish.",
          )
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
        setHackerNewsProgress(null)
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

  const competitorSpotlights = useMemo(
    () =>
      sortedCompetitors.slice(0, 3).map((competitor) => ({
        name: competitor.name?.trim() || "Competitor",
        focus:
          competitor.focusArea?.trim() ||
          competitor.positioning?.trim() ||
          null,
      })),
    [sortedCompetitors],
  )

  const competitorResearchNotes = useMemo(() => {
    if (!Array.isArray(profile?.competitorResearchNotes)) return []
    return profile!.competitorResearchNotes.filter(
      (note): note is string =>
        typeof note === "string" && note.trim().length > 0,
    )
  }, [profile])

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

  const hackerNewsQueries = useMemo(() => {
    return Array.isArray(profile?.hackerNewsQueries)
      ? (profile!.hackerNewsQueries as ProductInsightHackerNewsQuery[])
      : []
  }, [profile])

  const hackerNewsStories = useMemo(() => {
    if (!Array.isArray(profile?.hackerNewsStories)) return []
    return [
      ...(profile!.hackerNewsStories as ProductInsightHackerNewsStory[]),
    ].sort((a, b) => {
      const aScore = typeof a.points === "number" ? a.points : -1
      const bScore = typeof b.points === "number" ? b.points : -1
      if (bScore !== aScore) return bScore - aScore
      const aComments = typeof a.numComments === "number" ? a.numComments : -1
      const bComments = typeof b.numComments === "number" ? b.numComments : -1
      return bComments - aComments
    })
  }, [profile])

  const hackerNewsSummary = useMemo(() => {
    return (profile?.hackerNewsSummary ??
      null) as ProductInsightHackerNewsSummary | null
  }, [profile])

  const hasHackerNewsQueries = hackerNewsQueries.length > 0
  const hasHackerNewsResults = hackerNewsStories.length > 0

  const hackerNewsStats = useMemo(() => {
    let totalPoints = 0
    let totalComments = 0
    const matchedQueries = new Set<string>()
    const queryCounts = new Map<string, number>()

    for (const story of hackerNewsStories) {
      if (typeof story.points === "number" && Number.isFinite(story.points)) {
        totalPoints += story.points
      }
      if (
        typeof story.numComments === "number" &&
        Number.isFinite(story.numComments)
      ) {
        totalComments += story.numComments
      }
      for (const query of story.matchedQueries ?? []) {
        if (!query) continue
        matchedQueries.add(query)
        queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1)
      }
    }

    return {
      totalPoints,
      totalComments,
      matchedQueries,
      queryCounts,
    }
  }, [hackerNewsStories])

  const hackerNewsQueriesCovered = hackerNewsQueries.filter((entry) =>
    hackerNewsStats.matchedQueries.has(entry.query),
  ).length

  const hackerNewsCoveragePercent = hackerNewsQueries.length
    ? (hackerNewsQueriesCovered / hackerNewsQueries.length) * 100
    : null

  const topHackerNewsStories = useMemo(
    () => hackerNewsStories.slice(0, 3),
    [hackerNewsStories],
  )

  const remainingHackerNewsStories = useMemo(
    () => (hackerNewsStories.length > 3 ? hackerNewsStories.slice(3) : []),
    [hackerNewsStories],
  )

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

  const productHuntLaunches = useMemo(() => {
    if (!Array.isArray(profile?.productHuntLaunches)) return []
    return profile!.productHuntLaunches as ProductInsightProductHuntLaunch[]
  }, [profile])

  const productHuntSimilarLaunches = useMemo(() => {
    if (!Array.isArray(profile?.productHuntSimilarLaunches)) return []
    return profile!
      .productHuntSimilarLaunches as ProductInsightProductHuntLaunch[]
  }, [profile])

  const productHuntQueries = useMemo(() => {
    return Array.isArray(profile?.productHuntQueries)
      ? (profile!.productHuntQueries as string[])
      : []
  }, [profile])

  const matchedProductHuntLaunchId = profile?.productHuntMatchedLaunchId ?? null

  const sortedProductHuntLaunches = useMemo(() => {
    return [...productHuntLaunches].sort((a, b) => {
      const rankA =
        typeof a.rank === "number" ? a.rank : Number.POSITIVE_INFINITY
      const rankB =
        typeof b.rank === "number" ? b.rank : Number.POSITIVE_INFINITY
      return rankA - rankB
    })
  }, [productHuntLaunches])

  const highlightedProductHuntLaunch = useMemo(() => {
    if (!sortedProductHuntLaunches.length) return null
    if (matchedProductHuntLaunchId) {
      const matched = sortedProductHuntLaunches.find(
        (launch) => launch.id === matchedProductHuntLaunchId,
      )
      if (matched) return matched
    }
    return sortedProductHuntLaunches[0] ?? null
  }, [matchedProductHuntLaunchId, sortedProductHuntLaunches])

  const productHuntSummary = profile?.productHuntSummary ?? null

  const productHuntInsights = useMemo(() => {
    if (Array.isArray(profile?.productHuntInsights)) {
      return (profile!.productHuntInsights as string[]).filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
    }
    if (Array.isArray(productHuntSummary?.insights)) {
      return productHuntSummary.insights.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
    }
    return []
  }, [productHuntSummary, profile])

  const productHuntAverageVotesPerDay =
    typeof productHuntSummary?.averageVotesPerDay === "number"
      ? productHuntSummary.averageVotesPerDay
      : null

  const productHuntTrendingKeywords = Array.isArray(
    productHuntSummary?.trendingKeywords,
  )
    ? productHuntSummary!.trendingKeywords!.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
    : []

  const productHuntTopTopics = Array.isArray(productHuntSummary?.topTopics)
    ? productHuntSummary!.topTopics!
    : []

  const sortedProductHuntSimilarLaunches = useMemo(() => {
    return [...productHuntSimilarLaunches].sort((a, b) => {
      const votesPerDayA =
        typeof a.votesPerDay === "number" ? a.votesPerDay : -1
      const votesPerDayB =
        typeof b.votesPerDay === "number" ? b.votesPerDay : -1
      if (votesPerDayB !== votesPerDayA) return votesPerDayB - votesPerDayA
      const votesA = typeof a.voteCount === "number" ? a.voteCount : -1
      const votesB = typeof b.voteCount === "number" ? b.voteCount : -1
      return votesB - votesA
    })
  }, [productHuntSimilarLaunches])

  const productHuntSimilarPreview = useMemo(() => {
    return sortedProductHuntSimilarLaunches.slice(0, 4)
  }, [sortedProductHuntSimilarLaunches])

  const highlightedProductHuntStats = useMemo(() => {
    if (!highlightedProductHuntLaunch) return []
    const stats: Array<{ label: string; value: string }> = []

    if (typeof highlightedProductHuntLaunch.voteCount === "number") {
      stats.push({
        label: "Votes",
        value: COUNT_FORMATTER.format(highlightedProductHuntLaunch.voteCount),
      })
    }

    if (typeof highlightedProductHuntLaunch.votesPerDay === "number") {
      stats.push({
        label: "Votes/day",
        value: highlightedProductHuntLaunch.votesPerDay.toFixed(2),
      })
    }

    if (typeof highlightedProductHuntLaunch.commentToVoteRatio === "number") {
      stats.push({
        label: "Comments per vote",
        value: highlightedProductHuntLaunch.commentToVoteRatio.toFixed(2),
      })
    }

    if (typeof highlightedProductHuntLaunch.topicFollowerReach === "number") {
      stats.push({
        label: "Topic reach",
        value: COUNT_FORMATTER.format(
          highlightedProductHuntLaunch.topicFollowerReach,
        ),
      })
    }

    if (typeof highlightedProductHuntLaunch.daysSinceLaunch === "number") {
      stats.push({
        label: "Days live",
        value: highlightedProductHuntLaunch.daysSinceLaunch.toFixed(1),
      })
    }

    if (typeof highlightedProductHuntLaunch.daysToFeature === "number") {
      stats.push({
        label: "Days to feature",
        value: highlightedProductHuntLaunch.daysToFeature.toFixed(1),
      })
    }

    return stats
  }, [highlightedProductHuntLaunch])

  const hasProductHuntResults = productHuntLaunches.length > 0

  const productHuntSnapshotValue = hasProductHuntResults
    ? typeof productHuntAverageVotesPerDay === "number" &&
      productHuntAverageVotesPerDay > 0
      ? `${productHuntAverageVotesPerDay.toFixed(2)} votes/day avg`
      : `${COUNT_FORMATTER.format(productHuntSummary?.totalVotes ?? 0)} votes`
    : "Pending"

  const productHuntSnapshotCaption = hasProductHuntResults
    ? productHuntTrendingKeywords.length
      ? `Peers emphasize ${productHuntTrendingKeywords.slice(0, 3).join(", ")}`
      : productHuntSimilarLaunches.length
        ? `${COUNT_FORMATTER.format(productHuntSimilarLaunches.length)} similar launches`
        : (productHuntInsights[0] ?? "Launch snapshot ready")
    : "Awaiting launch data"

  const productHuntStatus = profile?.productHuntStatus ?? null
  const productHuntStatusDisplay = productHuntStatus
    ? STATUS_STYLES[productHuntStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastProductHuntDiscovery = profile?.lastProductHuntDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastProductHuntDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const shouldShowProductHuntEmptyState =
    !hasProductHuntResults && !isRunningPipeline

  const shouldSurfaceProductHuntNotices = Boolean(
    profile?.productHuntErrorMessage || shouldShowProductHuntEmptyState,
  )

  const shouldOpenProductHuntStage =
    hasProductHuntResults ||
    !!profile?.productHuntErrorMessage ||
    productHuntStatus === "pending" ||
    productHuntStatus === "failed"

  const hackerNewsStatus = profile?.hackerNewsStatus ?? null
  const hackerNewsStatusDisplay = hackerNewsStatus
    ? STATUS_STYLES[hackerNewsStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastHackerNewsDiscovery = profile?.lastHackerNewsDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastHackerNewsDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const hackerNewsCoverageTone: MetricTone =
    hackerNewsCoveragePercent !== null
      ? hackerNewsCoveragePercent >= 75
        ? "positive"
        : hackerNewsCoveragePercent >= 40
          ? "neutral"
          : "warning"
      : hackerNewsQueries.length
        ? "danger"
        : "neutral"

  const shouldShowHackerNewsEmptyState =
    !hasHackerNewsResults && !isRunningPipeline

  const shouldSurfaceHackerNewsNotices = Boolean(
    hackerNewsProgress ||
      profile?.hackerNewsErrorMessage ||
      shouldShowHackerNewsEmptyState,
  )

  const shouldOpenHackerNewsStage =
    hasHackerNewsResults ||
    !!hackerNewsProgress ||
    !!profile?.hackerNewsErrorMessage ||
    hackerNewsStatus === "pending" ||
    hackerNewsStatus === "failed"

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
  const showDiscussionSamples = false

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
  const recommendedActions = useMemo(() => {
    return Array.isArray(finalReport?.recommendedActions)
      ? finalReport!.recommendedActions
      : []
  }, [finalReport])
  const communityPlan = Array.isArray(finalReport?.communityPlan)
    ? finalReport!.communityPlan
    : []
  const metricsToWatch = Array.isArray(finalReport?.metricsToWatch)
    ? finalReport!.metricsToWatch
    : []

  const orderedRecommendedActions = useMemo<
    ProductInsightReportAction[]
  >(() => {
    if (!recommendedActions.length) return []

    return recommendedActions
      .map((action, index) => {
        const priorityRank =
          ACTION_PRIORITY_ORDER[action.priority] ?? Number.POSITIVE_INFINITY
        const timeframe = action.timeframe
        const timeframeRank = timeframe
          ? (ACTION_TIMEFRAME_ORDER[
              timeframe as NonNullable<ProductInsightReportAction["timeframe"]>
            ] ?? Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY
        return { action, priorityRank, timeframeRank, index }
      })
      .sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
          return a.priorityRank - b.priorityRank
        }
        if (a.timeframeRank !== b.timeframeRank) {
          return a.timeframeRank - b.timeframeRank
        }
        return a.index - b.index
      })
      .map((entry) => entry.action)
  }, [recommendedActions])

  const actionShortlist = useMemo(
    () => orderedRecommendedActions.slice(0, 3),
    [orderedRecommendedActions],
  )

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

  let pipelineStatusLabel: string
  if (pipelineNotice?.message) {
    pipelineStatusLabel = pipelineNotice.message
  } else if (isRunningPipeline) {
    pipelineStatusLabel =
      pipelineJobState === "queued" ? "Queued to run" : "Pipeline in progress"
  } else if (pipelineJobState === "queued") {
    pipelineStatusLabel = "Queued to run"
  } else if (pipelineJobState === "active") {
    pipelineStatusLabel = "Pipeline in progress"
  } else {
    pipelineStatusLabel = "Standing by"
  }

  const heroStatus =
    pipelineStatusLabel.length > 42
      ? `${pipelineStatusLabel.slice(0, 39)}…`
      : pipelineStatusLabel

  const heroStats = [
    { label: "Last report", value: lastReportGenerated },
    { label: "Capture depth", value: activeHarvestModeLabel },
    { label: "Status", value: heroStatus },
  ]

  const handleJumpToPlaybook = useCallback(() => {
    const target = recommendedActionsRef.current
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  const stageAlerts = useMemo(() => {
    const alerts: string[] = []

    if (erroredPages.length) {
      alerts.push(
        `${COUNT_FORMATTER.format(erroredPages.length)} page${
          erroredPages.length === 1 ? "" : "s"
        } failed during the crawl. Verify the sitemap and rerun the crawler for a complete baseline.`,
      )
    }

    if (crawlerHealthTone === "danger" && pageCount > 0) {
      alerts.push(
        `Crawler success is at ${crawlerHealthPercent}%—aim for 85%+ to trust downstream findings.`,
      )
    }

    if (
      coverageNeedsAttention &&
      hasSubredditResults &&
      coveragePercent !== null
    ) {
      alerts.push(
        `Community discovery only covered ${PERCENT_FORMATTER.format(coveragePercent)}% of planned queries. Queue another run once new signals are available.`,
      )
    }

    if (competitorStatus === "failed") {
      alerts.push(
        "The last competitor sweep failed. Retry to refresh differentiation cues.",
      )
    }

    if (discussionStatus === "failed") {
      alerts.push(
        "Discussion capture failed. Regenerate conversations to validate community sentiment.",
      )
    }

    if (reportStatus === "failed") {
      alerts.push(
        "Regenerate the comprehensive report to unlock the recommended playbook.",
      )
    }

    if (
      !hasFinalReport &&
      !isPipelinePending &&
      (hasDiscussionThreads || hasSubredditResults)
    ) {
      alerts.push(
        "Convert the captured signals into a report run to prioritise next steps.",
      )
    }

    return alerts
  }, [
    coverageNeedsAttention,
    coveragePercent,
    crawlerHealthPercent,
    crawlerHealthTone,
    discussionStatus,
    erroredPages.length,
    hasDiscussionThreads,
    hasFinalReport,
    hasSubredditResults,
    isPipelinePending,
    pageCount,
    competitorStatus,
    reportStatus,
  ])

  const communityPlanCount = communityPlan.length
  const metricsToWatchCount = metricsToWatch.length

  const reportQuickFacts: Array<{
    label: string
    value: string
    tone: MetricTone
  }> = [
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

  const snapshotMetrics: Array<{
    label: string
    value: string
    tone: MetricTone
    icon: ReactNode
    caption?: string
  }> = [
    {
      label: "Product foundation",
      value: profile
        ? statusDisplay.label
        : isRunningPipeline
          ? "Processing"
          : "Not generated",
      tone:
        statusDisplay.badge === "success"
          ? "positive"
          : statusDisplay.badge === "destructive"
            ? "danger"
            : statusDisplay.badge === "secondary"
              ? "neutral"
              : "warning",
      icon: "🧱",
      caption:
        lastCrawled !== "Never" ? `Last run ${lastCrawled}` : "Not yet run",
    },
    {
      label: "Community discovery",
      value: hasSubredditResults
        ? `${COUNT_FORMATTER.format(subreddits.length)} mapped`
        : "Pending",
      tone: hasSubredditResults
        ? "positive"
        : subredditStatusDisplay.badge === "destructive"
          ? "warning"
          : "neutral",
      icon: "🧭",
      caption:
        coveragePercent !== null
          ? `${PERCENT_FORMATTER.format(coveragePercent)}% query match`
          : "Awaiting coverage",
    },
    {
      label: "Product Hunt traction",
      value: productHuntSnapshotValue,
      tone: hasProductHuntResults
        ? "positive"
        : productHuntStatusDisplay.badge === "destructive"
          ? "warning"
          : "neutral",
      icon: "📊",
      caption: productHuntSnapshotCaption,
    },
    {
      label: "Hacker News",
      value: hasHackerNewsResults
        ? `${COUNT_FORMATTER.format(hackerNewsStories.length)} stories`
        : "Pending",
      tone: hasHackerNewsResults
        ? "positive"
        : hackerNewsStatusDisplay.badge === "destructive"
          ? "warning"
          : "neutral",
      icon: "🚀",
      caption:
        hackerNewsCoveragePercent !== null
          ? `${PERCENT_FORMATTER.format(hackerNewsCoveragePercent)}% query coverage`
          : hasHackerNewsQueries
            ? "Awaiting matches"
            : "No queries configured",
    },
    {
      label: "Discussion insights",
      value: hasDiscussionThreads
        ? `${COUNT_FORMATTER.format(discussionThreads.length)} threads`
        : "Pending",
      tone: hasDiscussionThreads
        ? "positive"
        : discussionStatusDisplay.badge === "destructive"
          ? "warning"
          : "neutral",
      icon: "💬",
      caption: focusAreas.length
        ? `${COUNT_FORMATTER.format(focusAreas.length)} focus theme${
            focusAreas.length === 1 ? "" : "s"
          }`
        : "No themes yet",
    },
    {
      label: "Insight report",
      value: hasFinalReport
        ? `${COUNT_FORMATTER.format(actionCount)} action${actionCount === 1 ? "" : "s"}`
        : "Pending",
      tone: hasFinalReport
        ? "positive"
        : reportStatusDisplay.badge === "destructive"
          ? "warning"
          : "neutral",
      icon: "📊",
      caption:
        lastReportGenerated !== "Never"
          ? `Updated ${lastReportGenerated}`
          : "Awaiting synthesis",
    },
  ]

  const sentimentDistribution = useMemo<{
    data: Array<{ key: SentimentKey; label: string; value: number }>
    total: number
  } | null>(() => {
    if (!discussionInsights?.sections?.length) return null

    const counts: Record<SentimentKey, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
    }

    for (const section of discussionInsights.sections) {
      for (const item of section.items ?? []) {
        if (!item?.sentiment) continue
        if (isSentimentKey(item.sentiment)) {
          counts[item.sentiment] += 1
        }
      }
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    if (!total) return null

    const data = (Object.entries(counts) as Array<[SentimentKey, number]>)
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

  const sentimentSummaryText = useMemo(() => {
    if (!sentimentDistribution) return null
    const counts: Record<SentimentKey, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
    }
    sentimentDistribution.data.forEach((entry) => {
      if (isSentimentKey(entry.key)) {
        counts[entry.key] = entry.value
      }
    })
    const total = counts.positive + counts.negative + counts.neutral
    if (!total) return null
    return `Positive ${COUNT_FORMATTER.format(counts.positive)} • Negative ${COUNT_FORMATTER.format(counts.negative)} • Neutral ${COUNT_FORMATTER.format(counts.neutral)}`
  }, [sentimentDistribution])

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

  const shouldOpenCrawlerStage = false
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

  const renderProductHuntError = () => {
    if (!profile?.productHuntErrorMessage) return null
    return (
      <InfoNotice tone="error">{profile.productHuntErrorMessage}</InfoNotice>
    )
  }

  const renderProductHuntEmptyState = () => {
    if (!shouldShowProductHuntEmptyState) return null
    return (
      <InfoNotice tone="info" size="xs">
        Run the pipeline to capture recent launch performance and discussion
        signals from Product Hunt.
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

  const renderHackerNewsProgress = () => {
    if (!hackerNewsProgress) return null
    return (
      <InfoNotice tone="info" size="xs">
        {hackerNewsProgress}
      </InfoNotice>
    )
  }

  const renderHackerNewsError = () => {
    if (!profile?.hackerNewsErrorMessage) return null
    return (
      <InfoNotice tone="error">{profile.hackerNewsErrorMessage}</InfoNotice>
    )
  }

  const renderHackerNewsEmptyState = () => {
    if (!shouldShowHackerNewsEmptyState) return null
    return (
      <InfoNotice tone="info" size="xs">
        Run the pipeline to capture recent Hacker News threads referencing this
        product.
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
    <>
      <AnalyticsFeedbackPrompt
        className="mb-6 justify-end"
        storageKey="shipyardhq:feedback-nudge:insights"
        buttonLabel="Share insights feedback"
        title="Need richer product insights?"
        description="Tell us what the crawl, community sweep, or discussion analysis should surface next."
        body="Flag missing competitor intel, channels you monitor, or decisions you can't make yet. Every note helps us tune the pipeline."
        primaryLabel="Open feedback form"
        secondaryLabel="Not now"
      />
      <div className="space-y-10">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Insights pipeline</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isPipelinePending
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-300",
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-foreground lg:text-3xl">
                    Find insights
                  </h2>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Launch a full crawl, community sweep, discussion analysis,
                    and strategy report in one pass. We&rsquo;ll email you when
                    the playbook ships.
                  </p>
                </div>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[120px] rounded-lg border border-slate-200 bg-white p-3 text-left"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <CardContent className="space-y-4 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor={deepHarvestSwitchId}
                  className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Deep capture
                </Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id={deepHarvestSwitchId}
                    checked={isDeepMode}
                    onCheckedChange={setIsDeepMode}
                    disabled={isPipelinePending}
                    aria-label="Toggle deep discussion capture"
                  />
                  <span className="text-sm text-muted-foreground">
                    Pull expanded community threads and broader discovery
                    prompts.
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  onClick={handleRunPipeline}
                  disabled={isPipelinePending}
                  className="w-full sm:w-auto"
                >
                  {isPipelinePending ? "Finding insights…" : "Find insights"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {pipelineNotice ? (
                <InfoNotice tone={pipelineNotice.tone} size="xs">
                  {pipelineNotice.message}
                </InfoNotice>
              ) : (
                <div className="text-xs text-muted-foreground">
                  We&rsquo;ll notify you in-app and via email when the run
                  completes.
                </div>
              )}
            </div>
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
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {snapshotMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
                    FACT_TONE_STYLES[metric.tone],
                  )}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/70 text-lg">
                    {metric.icon}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-foreground">
                      {metric.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metric.value}
                    </div>
                    {metric.caption ? (
                      <div className="text-[11px] text-slate-600">
                        {metric.caption}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Next best actions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {actionShortlist.length
                          ? "Focus here before digging into the deeper dataset."
                          : "Run the comprehensive report to surface your next moves."}
                      </div>
                    </div>
                    {recommendedActions.length ? (
                      <button
                        type="button"
                        onClick={handleJumpToPlaybook}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        Open full playbook
                      </button>
                    ) : null}
                  </div>
                  {actionShortlist.length ? (
                    <ol className="space-y-3 text-sm text-muted-foreground">
                      {actionShortlist.map((action, index) => {
                        const priorityBadge =
                          ACTION_PRIORITY_BADGE[action.priority]
                        const timeframe = action.timeframe
                          ? (ACTION_TIMEFRAME_LABEL[
                              action.timeframe as NonNullable<
                                ProductInsightReportAction["timeframe"]
                              >
                            ] ?? null)
                          : null
                        return (
                          <li
                            key={`action-shortlist-${index}-${action.title}`}
                            className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <span className="flex items-center gap-2 font-semibold text-foreground">
                                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-muted-foreground">
                                  {index + 1}
                                </span>
                                {action.title}
                              </span>
                              {priorityBadge ? (
                                <Badge
                                  variant={priorityBadge.badge}
                                  className="text-[11px]"
                                >
                                  {priorityBadge.label}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-xs leading-relaxed text-muted-foreground">
                              {action.description}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              {timeframe ? (
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-semibold text-primary">
                                  {timeframe}
                                </span>
                              ) : null}
                              {action.successMetric ? (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-foreground">
                                  Success: {action.successMetric}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-muted-foreground">
                      <span role="img" aria-hidden className="text-base">
                        🚀
                      </span>
                      <span>
                        Queue a report run once the crawler, community, and
                        discussion stages are ready to unlock an actionable
                        shortlist.
                      </span>
                    </div>
                  )}
                </section>

                {stageAlerts.length ? (
                  <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-amber-900">
                      Strengthen signal quality
                    </div>
                    <ul className="space-y-2 text-xs text-amber-900">
                      {stageAlerts.map((alert, index) => (
                        <li key={`alert-${index}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                          <span>{alert}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
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
                    {sentimentSummaryText ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                        {sentimentSummaryText}
                      </div>
                    ) : null}
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
                      cells={snapshotChart.data.map((entry) => ({
                        fill:
                          snapshotChart.colors[entry.key] ?? "var(--chart-2)",
                        stroke: "var(--card)",
                      }))}
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

        <StageCard
          step="Step 1"
          title="Product foundation"
          description="The pipeline crawler captures live messaging and structure for this product."
          status={statusDisplay}
          metrics={[
            {
              label: "Pages captured",
              value: profile ? COUNT_FORMATTER.format(pageCount) : "—",
              tone: pageCount ? "positive" : "warning",
            },
            {
              label: "Errors",
              value: profile
                ? COUNT_FORMATTER.format(erroredPages.length)
                : "—",
              tone: erroredPages.length ? "danger" : "positive",
            },
            {
              label: "Last run",
              value: lastCrawled,
              tone: lastCrawled === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenCrawlerStage}
        >
          <>
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    <span>Since last run:</span>
                    <span>
                      {lastCrawled !== "Never"
                        ? `${pageCount} pages captured`
                        : "Crawler ready to run"}
                    </span>
                  </div>
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
                        Check that the sitemap is reachable and rerun the
                        crawler.
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
                        Run the crawler to capture sitemap URLs for this
                        product.
                      </div>
                    )}
                  </div>
                </section>
                <div className="space-y-6">
                  {profile && !isRunningPipeline && !summary ? (
                    <InfoNotice tone="info" size="xs">
                      We captured the crawl but did not synthesize a summary
                      yet. Run another insights pass if you recently updated the
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
                              className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm"
                            >
                              <div className="text-sm font-semibold text-foreground">
                                {section.title}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {section.items.map((item, index) => (
                                  <span
                                    key={`${section.title}-${index}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700"
                                  >
                                    <span className="text-xs">•</span>
                                    <span>{item}</span>
                                  </span>
                                ))}
                              </div>
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
          metrics={[
            {
              label: "Competitors",
              value: hasCompetitorResults
                ? COUNT_FORMATTER.format(sortedCompetitors.length)
                : "0",
              tone: hasCompetitorResults ? "positive" : "warning",
            },
            {
              label: "Gap signals",
              value: COUNT_FORMATTER.format(
                sortedCompetitors.filter(
                  (entry) =>
                    Array.isArray(entry.weaknesses) && entry.weaknesses.length,
                ).length,
              ),
              tone: "neutral",
            },
            {
              label: "Last refreshed",
              value: lastCompetitorDiscovery,
              tone: lastCompetitorDiscovery === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenCompetitorStage}
        >
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <span>Since last run:</span>
                <span>
                  {hasCompetitorResults
                    ? `${COUNT_FORMATTER.format(sortedCompetitors.length)} competitors mapped`
                    : "Landscape ready to refresh"}
                </span>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Competitive snapshot
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Direct and adjacent products highlighted from the crawl
                      and synthesis context.
                    </div>
                  </div>
                </div>

                {shouldSurfaceCompetitorNotices ? (
                  <div className="space-y-2">
                    {renderCompetitorProgress()}
                    {renderCompetitorError()}
                    {renderCompetitorEmptyState()}
                  </div>
                ) : null}

                {hasCompetitorResults ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Top rivals right now
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {competitorSpotlights.map((spotlight) => (
                        <span
                          key={`spotlight-${spotlight.name}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-foreground"
                        >
                          <span>{spotlight.name}</span>
                          {spotlight.focus ? (
                            <span className="text-muted-foreground">
                              • {spotlight.focus}
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasCompetitorResults || competitorResearchNotes.length ? (
                  <Collapsible
                    open={showCompetitorDeepDive}
                    onOpenChange={setShowCompetitorDeepDive}
                    className="space-y-4"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        <span>
                          {showCompetitorDeepDive
                            ? "Hide full landscape"
                            : "Show full landscape"}
                        </span>
                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            showCompetitorDeepDive ? "rotate-180" : "rotate-0",
                          )}
                          aria-hidden
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4">
                      {hasCompetitorResults ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {sortedCompetitors.map((competitor, index) => {
                            const differentiators = Array.isArray(
                              competitor.differentiators,
                            )
                              ? competitor.differentiators.filter(
                                  (item): item is string =>
                                    typeof item === "string" &&
                                    item.trim().length > 0,
                                )
                              : []
                            const strengths = Array.isArray(
                              competitor.strengths,
                            )
                              ? competitor.strengths.filter(
                                  (item): item is string =>
                                    typeof item === "string" &&
                                    item.trim().length > 0,
                                )
                              : []
                            const weaknesses = Array.isArray(
                              competitor.weaknesses,
                            )
                              ? competitor.weaknesses.filter(
                                  (item): item is string =>
                                    typeof item === "string" &&
                                    item.trim().length > 0,
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
                            const focusArea =
                              competitor.focusArea?.trim() || null
                            const positioning =
                              competitor.positioning?.trim() || null
                            const source = competitor.source?.trim() || null
                            const visitUrl = competitor.url ?? null

                            return (
                              <div
                                key={`${competitor.name || "competitor"}-${index}`}
                                className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-start justify-between gap-3">
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
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
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
                                        className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary/10"
                                      >
                                        Visit site
                                      </Link>
                                    ) : null}
                                  </div>
                                </div>
                                {competitor.description ? (
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                                    {competitor.description}
                                  </div>
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
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {strengths.map((item) => (
                                          <span
                                            key={`${competitor.name}-strength-${item}`}
                                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                          >
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                  {weaknesses.length ? (
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Gaps
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {weaknesses.map((item) => (
                                          <span
                                            key={`${competitor.name}-weakness-${item}`}
                                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                          >
                                            {item}
                                          </span>
                                        ))}
                                      </div>
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
                    </CollapsibleContent>
                  </Collapsible>
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
          metrics={[
            {
              label: "Communities",
              value: hasSubredditResults
                ? COUNT_FORMATTER.format(subreddits.length)
                : "0",
              tone: hasSubredditResults ? "positive" : "warning",
            },
            {
              label: "Query coverage",
              value:
                coveragePercent !== null
                  ? `${PERCENT_FORMATTER.format(coveragePercent)}%`
                  : "—",
              tone:
                coveragePercent !== null
                  ? coveragePercent >= REQUIRED_QUERY_COVERAGE_PERCENT
                    ? "positive"
                    : "warning"
                  : "neutral",
            },
            {
              label: "Last refreshed",
              value: lastSubredditDiscovery,
              tone: lastSubredditDiscovery === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenSubredditStage}
        >
          <>
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span>Since last run:</span>
                  <span>
                    {hasSubredditResults
                      ? `${COUNT_FORMATTER.format(subreddits.length)} communities cached`
                      : "Discovery pending"}
                  </span>
                </div>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <Collapsible
                      open={showCommunityInputs}
                      onOpenChange={setShowCommunityInputs}
                      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Search plan inputs
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Prompts that seeded this community discovery run.
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {subredditQueries.length ? (
                            <Badge variant="outline" className="text-[11px]">
                              {COUNT_FORMATTER.format(subredditQueries.length)}{" "}
                              {subredditQueries.length === 1
                                ? "query"
                                : "queries"}
                            </Badge>
                          ) : null}
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            >
                              {showCommunityInputs
                                ? "Hide inputs"
                                : "Show inputs"}
                              <ChevronDownIcon
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  showCommunityInputs
                                    ? "rotate-180"
                                    : "rotate-0",
                                )}
                                aria-hidden
                              />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent>
                        {subredditQueries.length ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {subredditQueries.map((item) => {
                              const matchCount =
                                communityStats.queryMatchCounts.get(
                                  item.query,
                                ) ?? 0
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
                                      variant={
                                        matchCount ? "secondary" : "outline"
                                      }
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
                          <InfoNotice tone="info" size="xs">
                            Run discovery to generate targeted community search
                            queries for this product.
                          </InfoNotice>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
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
                                    {subreddit.name}
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
                            Run an insights pass to craft community search
                            plans, resolve the best-fit groups, and cache them
                            for future research or outreach.
                          </InfoNotice>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
              {hasSubredditResults ? (
                <Collapsible
                  open={showCommunityDeepDive}
                  onOpenChange={setShowCommunityDeepDive}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
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
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="self-start text-[11px]"
                      >
                        {`${COUNT_FORMATTER.format(subreddits.length)} ${
                          subreddits.length === 1 ? "community" : "communities"
                        }`}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          {showCommunityDeepDive
                            ? "Hide table"
                            : "Show full table"}
                          <ChevronDownIcon
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              showCommunityDeepDive ? "rotate-180" : "rotate-0",
                            )}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent asChild>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[160px]">
                              Community
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
                                  {subreddit.name}
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
                                  {subreddit.description ||
                                    subreddit.title ||
                                    "—"}
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
                          {`${subreddits.length} ${
                            subreddits.length === 1
                              ? "community"
                              : "communities"
                          } saved for this product`}
                        </TableCaption>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          </>
        </StageCard>

        <StageCard
          step="Step 4"
          title="Product Hunt launches"
          description="Gauge launch traction and discover how adjacent launches position themselves before the report synthesizes recommendations."
          status={productHuntStatusDisplay}
          metrics={[
            {
              label: "Launches",
              value: hasProductHuntResults
                ? COUNT_FORMATTER.format(productHuntLaunches.length)
                : "0",
              tone: hasProductHuntResults ? "positive" : "warning",
            },
            {
              label: "Similar launches",
              value: productHuntSimilarLaunches.length
                ? COUNT_FORMATTER.format(productHuntSimilarLaunches.length)
                : "0",
              tone: productHuntSimilarLaunches.length ? "neutral" : "neutral",
            },
            {
              label: "Avg votes/day",
              value:
                typeof productHuntAverageVotesPerDay === "number"
                  ? productHuntAverageVotesPerDay.toFixed(2)
                  : "—",
              tone: productHuntAverageVotesPerDay ? "positive" : "neutral",
            },
            {
              label: "Last refreshed",
              value: lastProductHuntDiscovery,
              tone:
                lastProductHuntDiscovery === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenProductHuntStage}
        >
          <>
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span>Since last run:</span>
                  <span>
                    {hasProductHuntResults
                      ? `${COUNT_FORMATTER.format(productHuntLaunches.length)} launches captured`
                      : "Launch monitoring ready"}
                  </span>
                </div>
                <div className="space-y-6">
                  {shouldSurfaceProductHuntNotices ? (
                    <div className="space-y-2">
                      {renderProductHuntError()}
                      {renderProductHuntEmptyState()}
                    </div>
                  ) : null}

                  {hasProductHuntResults ? (
                    <div className="space-y-6">
                      {highlightedProductHuntLaunch ? (
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  Primary launch
                                </Badge>
                                {highlightedProductHuntLaunch.isFeatured ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    Featured
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="text-lg font-semibold text-foreground">
                                {highlightedProductHuntLaunch.name}
                              </div>
                              {highlightedProductHuntLaunch.tagline ? (
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                  {highlightedProductHuntLaunch.tagline}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700">
                              {typeof highlightedProductHuntLaunch.votesPerDay ===
                              "number" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs">
                                  ⚡{" "}
                                  {highlightedProductHuntLaunch.votesPerDay.toFixed(
                                    2,
                                  )}{" "}
                                  votes/day
                                </span>
                              ) : null}
                              <Link
                                href={highlightedProductHuntLaunch.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                              >
                                View on Product Hunt
                              </Link>
                              {highlightedProductHuntLaunch.externalUrl ? (
                                <Link
                                  href={
                                    highlightedProductHuntLaunch.externalUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                                >
                                  Visit live site
                                </Link>
                              ) : null}
                            </div>
                          </div>

                          {highlightedProductHuntStats.length ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {highlightedProductHuntStats.map((stat) => (
                                <div
                                  key={`highlight-stat-${stat.label}`}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm"
                                >
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {stat.label}
                                  </div>
                                  <div className="text-sm font-semibold text-foreground">
                                    {stat.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {Array.isArray(highlightedProductHuntLaunch.topics) &&
                          highlightedProductHuntLaunch.topics.length ? (
                            <div className="flex flex-wrap gap-2">
                              {highlightedProductHuntLaunch.topics
                                .slice(0, 6)
                                .map((topic) => (
                                  <Badge
                                    key={`highlight-topic-${topic.slug ?? topic.name}`}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {topic.name}
                                  </Badge>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {(productHuntInsights.length ||
                        productHuntTrendingKeywords.length ||
                        productHuntTopTopics.length) && (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {productHuntInsights.length ? (
                            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Opportunity signals
                              </div>
                              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                                {productHuntInsights.map((insight) => (
                                  <li key={insight}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          <div className="space-y-4">
                            {productHuntTrendingKeywords.length ? (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Trending keywords
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {productHuntTrendingKeywords.map(
                                    (keyword) => (
                                      <Badge
                                        key={`keyword-${keyword}`}
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {keyword}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {productHuntTopTopics.length ? (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Popular peer topics
                                </div>
                                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                                  {productHuntTopTopics
                                    .slice(0, 5)
                                    .map((topic) => (
                                      <div
                                        key={`topic-${topic.slug ?? topic.name}`}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <div className="font-semibold text-foreground">
                                          {topic.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {topic.count} mentions
                                          {typeof topic.followersCount ===
                                          "number"
                                            ? ` • ${COUNT_FORMATTER.format(topic.followersCount)} followers`
                                            : ""}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {productHuntSimilarPreview.length ? (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                Similar launches to study
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pulled via competitor names, product messaging,
                                and shared topics.
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="self-start text-[11px]"
                            >
                              {COUNT_FORMATTER.format(
                                productHuntSimilarLaunches.length,
                              )}{" "}
                              {productHuntSimilarLaunches.length === 1
                                ? "match"
                                : "matches"}
                            </Badge>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-2">
                            {productHuntSimilarPreview.map((launch) => (
                              <div
                                key={`product-hunt-similar-${launch.id}`}
                                className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <Link
                                      href={launch.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-foreground hover:underline"
                                    >
                                      {launch.name}
                                    </Link>
                                    {launch.tagline ? (
                                      <p className="text-xs text-muted-foreground">
                                        {launch.tagline}
                                      </p>
                                    ) : null}
                                  </div>
                                  {typeof launch.votesPerDay === "number" ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {launch.votesPerDay.toFixed(2)} votes/day
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                                    🔼{" "}
                                    {COUNT_FORMATTER.format(
                                      launch.voteCount ?? 0,
                                    )}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                                    💬{" "}
                                    {COUNT_FORMATTER.format(
                                      launch.commentsCount ?? 0,
                                    )}
                                  </span>
                                  {typeof launch.commentToVoteRatio ===
                                  "number" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                                      🗣️ {launch.commentToVoteRatio.toFixed(2)}{" "}
                                      comments/vote
                                    </span>
                                  ) : null}
                                </div>
                                {Array.isArray(launch.topics) &&
                                launch.topics.length ? (
                                  <div className="flex flex-wrap gap-1 text-[10px]">
                                    {launch.topics.slice(0, 4).map((topic) => (
                                      <Badge
                                        key={`similar-topic-${launch.id}-${topic.slug ?? topic.name}`}
                                        variant="outline"
                                      >
                                        {topic.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              {productHuntQueries.length ? (
                <Collapsible
                  open={showProductHuntInputs}
                  onOpenChange={setShowProductHuntInputs}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Search plan inputs
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Queries and matchers used against the Product Hunt
                        index.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {COUNT_FORMATTER.format(productHuntQueries.length)}{" "}
                        {productHuntQueries.length === 1 ? "query" : "queries"}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          {showProductHuntInputs
                            ? "Hide queries"
                            : "Show queries"}
                          <ChevronDownIcon
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              showProductHuntInputs ? "rotate-180" : "rotate-0",
                            )}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-2">
                      {productHuntQueries.map((query) => (
                        <span
                          key={query}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-foreground"
                        >
                          {query}
                        </span>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          </>
        </StageCard>

        <StageCard
          step="Step 5"
          title="Hacker News mentions"
          description="Monitor launch chatter and comparisons from Hacker News to enrich community insights."
          status={hackerNewsStatusDisplay}
          metrics={[
            {
              label: "Stories",
              value: hasHackerNewsResults
                ? COUNT_FORMATTER.format(hackerNewsStories.length)
                : "0",
              tone: hasHackerNewsResults ? "positive" : "warning",
            },
            {
              label: "Total upvotes",
              value: hackerNewsStats.totalPoints
                ? COUNT_FORMATTER.format(hackerNewsStats.totalPoints)
                : "0",
              tone: hackerNewsStats.totalPoints ? "positive" : "neutral",
            },
            {
              label: "Query coverage",
              value:
                hackerNewsCoveragePercent !== null
                  ? `${PERCENT_FORMATTER.format(hackerNewsCoveragePercent)}%`
                  : hasHackerNewsQueries
                    ? "0%"
                    : "—",
              tone: hackerNewsCoverageTone,
            },
            {
              label: "Last refreshed",
              value: lastHackerNewsDiscovery,
              tone: lastHackerNewsDiscovery === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenHackerNewsStage}
        >
          <>
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span>Since last run:</span>
                  <span>
                    {hasHackerNewsResults
                      ? `${COUNT_FORMATTER.format(hackerNewsStories.length)} stories captured`
                      : "Monitoring pending"}
                  </span>
                </div>
                <div className="space-y-6">
                  {shouldSurfaceHackerNewsNotices ? (
                    <div className="space-y-2">
                      {renderHackerNewsProgress()}
                      {renderHackerNewsError()}
                      {renderHackerNewsEmptyState()}
                    </div>
                  ) : null}

                  {hackerNewsSummary ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-foreground">
                          Key takeaways
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Synthesized from the latest Hacker News threads pulled
                          in this run.
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {hackerNewsSummary.summary}
                      </p>
                      {hackerNewsSummary.highlights?.length ? (
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {hackerNewsSummary.highlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                          ))}
                        </ul>
                      ) : null}
                      {Array.isArray(hackerNewsSummary.topStories) &&
                      hackerNewsSummary.topStories.length ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Referenced threads
                          </div>
                          <div className="space-y-2">
                            {hackerNewsSummary.topStories.map((story) => (
                              <div
                                key={story.discussionUrl}
                                className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm"
                              >
                                <Link
                                  href={story.discussionUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-primary hover:underline"
                                >
                                  {story.title}
                                </Link>
                                {story.keyTakeaway ? (
                                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    {story.keyTakeaway}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasHackerNewsQueries ? (
                    <Collapsible
                      open={showHackerNewsInputs}
                      onOpenChange={setShowHackerNewsInputs}
                      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Search plan inputs
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Queries that seeded the Hacker News pass.
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {COUNT_FORMATTER.format(hackerNewsQueries.length)}{" "}
                            {hackerNewsQueries.length === 1
                              ? "query"
                              : "queries"}
                          </Badge>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            >
                              {showHackerNewsInputs
                                ? "Hide inputs"
                                : "Show inputs"}
                              <ChevronDownIcon
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  showHackerNewsInputs
                                    ? "rotate-180"
                                    : "rotate-0",
                                )}
                                aria-hidden
                              />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {hackerNewsQueries.map((query) => {
                            const matchCount =
                              hackerNewsStats.queryCounts.get(query.query) ?? 0
                            const covered = hackerNewsStats.matchedQueries.has(
                              query.query,
                            )
                            return (
                              <div
                                key={query.query}
                                className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-semibold leading-snug text-foreground">
                                    {query.query}
                                  </div>
                                  <Badge
                                    variant={covered ? "secondary" : "outline"}
                                    className="text-[10px]"
                                  >
                                    {covered
                                      ? `${COUNT_FORMATTER.format(matchCount)} match${
                                          matchCount === 1 ? "" : "es"
                                        }`
                                      : "No matches yet"}
                                  </Badge>
                                </div>
                                {query.rationale ? (
                                  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    {query.rationale}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : null}

                  {!hasHackerNewsQueries && !hackerNewsProgress ? (
                    <InfoNotice tone="info" size="xs">
                      Add product keywords or competitors, then re-run the
                      pipeline to generate targeted Hacker News queries.
                    </InfoNotice>
                  ) : null}

                  {hasHackerNewsResults ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 xl:grid-cols-3">
                        {topHackerNewsStories.map((story) => (
                          <Link
                            key={story.id}
                            href={story.discussionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                  {story.title}
                                </div>
                                {typeof story.points === "number" ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px]"
                                  >
                                    {COUNT_FORMATTER.format(story.points)}{" "}
                                    points
                                  </Badge>
                                ) : null}
                              </div>
                              {story.snippet ? (
                                <div className="text-xs leading-relaxed text-muted-foreground">
                                  {story.snippet}
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              {typeof story.numComments === "number" ? (
                                <span>
                                  {COUNT_FORMATTER.format(story.numComments)}{" "}
                                  comment
                                  {story.numComments === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {story.matchedQueries?.length ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                  🔍{" "}
                                  {COUNT_FORMATTER.format(
                                    story.matchedQueries.length,
                                  )}{" "}
                                  query
                                  {story.matchedQueries.length === 1
                                    ? ""
                                    : "ies"}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1 text-primary">
                                View thread ↗
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {remainingHackerNewsStories.length ? (
                        <Collapsible
                          open={showHackerNewsDeepDive}
                          onOpenChange={setShowHackerNewsDeepDive}
                          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                Additional mentions
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Expand to review the remaining captured threads.
                              </div>
                            </div>
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                              >
                                {showHackerNewsDeepDive
                                  ? "Hide mentions"
                                  : "Show mentions"}
                                <ChevronDownIcon
                                  className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-200",
                                    showHackerNewsDeepDive
                                      ? "rotate-180"
                                      : "rotate-0",
                                  )}
                                  aria-hidden
                                />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[220px]">
                                    Thread
                                  </TableHead>
                                  <TableHead className="min-w-[120px]">
                                    Points
                                  </TableHead>
                                  <TableHead className="min-w-[120px]">
                                    Comments
                                  </TableHead>
                                  <TableHead>Matched queries</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {hackerNewsStories.map((story) => (
                                  <TableRow key={`hn-${story.id}`}>
                                    <TableCell className="whitespace-normal break-words text-sm text-primary">
                                      <a
                                        href={story.discussionUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="hover:underline"
                                      >
                                        {story.title}
                                      </a>
                                    </TableCell>
                                    <TableCell className="text-sm text-foreground">
                                      {typeof story.points === "number"
                                        ? COUNT_FORMATTER.format(story.points)
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm text-foreground">
                                      {typeof story.numComments === "number"
                                        ? COUNT_FORMATTER.format(
                                            story.numComments,
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {story.matchedQueries?.length
                                        ? story.matchedQueries.join(" • ")
                                        : "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        </StageCard>
        <StageCard
          step="Step 6"
          title="Discussion insights"
          description="Review community conversations to surface wins, friction, and opportunities."
          status={discussionStatusDisplay}
          metrics={[
            {
              label: "Threads",
              value: hasDiscussionThreads
                ? COUNT_FORMATTER.format(discussionThreads.length)
                : "0",
              tone: hasDiscussionThreads ? "positive" : "warning",
            },
            {
              label: "Focus themes",
              value: focusAreas.length
                ? COUNT_FORMATTER.format(focusAreas.length)
                : "0",
              tone: focusAreas.length ? "positive" : "neutral",
            },
            {
              label: "Last refreshed",
              value: lastDiscussionDiscovery,
              tone: lastDiscussionDiscovery === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenDiscussionStage}
        >
          <>
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span>Since last run:</span>
                  <span>
                    {hasDiscussionThreads
                      ? `${COUNT_FORMATTER.format(discussionThreads.length)} conversations reviewed`
                      : "Awaiting conversation capture"}
                  </span>
                </div>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <Collapsible
                      open={showDiscussionInputs}
                      onOpenChange={setShowDiscussionInputs}
                      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Capture inputs & themes
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Discovery prompts powering this discussion pass.
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {discussionQueries.length ? (
                            <Badge variant="outline" className="text-[11px]">
                              {COUNT_FORMATTER.format(discussionQueries.length)}{" "}
                              {discussionQueries.length === 1
                                ? "query"
                                : "queries"}
                            </Badge>
                          ) : null}
                          {focusAreas.length ? (
                            <Badge variant="secondary" className="text-[11px]">
                              {COUNT_FORMATTER.format(focusAreas.length)} theme
                              {focusAreas.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            >
                              {showDiscussionInputs
                                ? "Hide inputs"
                                : "Show inputs"}
                              <ChevronDownIcon
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  showDiscussionInputs
                                    ? "rotate-180"
                                    : "rotate-0",
                                )}
                                aria-hidden
                              />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent className="space-y-4">
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
                          <InfoNotice tone="info" size="xs">
                            Run an insights pass to craft fresh discussion
                            prompts from your saved communities.
                          </InfoNotice>
                        )}

                        {discussionInsights ? (
                          focusAreas.length ? (
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
                              No focus areas yet—rerun the analysis after the
                              next insights pass to capture more community
                              signals.
                            </InfoNotice>
                          )
                        ) : null}
                      </CollapsibleContent>
                    </Collapsible>

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
                                  <div className="mt-auto text-[11px] text-muted-foreground">
                                    Backed by curated quotes and discussions.
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <InfoNotice tone="info" size="xs">
                            We did not identify specific insight sections from
                            the sampled threads yet. Rerun the analysis once the
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
                <Collapsible
                  open={showDiscussionDeepDive}
                  onOpenChange={setShowDiscussionDeepDive}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
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
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="self-start text-[11px]"
                      >
                        {COUNT_FORMATTER.format(discussionSections.length)}{" "}
                        cluster
                        {discussionSections.length === 1 ? "" : "s"}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          {showDiscussionDeepDive
                            ? "Hide deep dive"
                            : "Show full deep dive"}
                          <ChevronDownIcon
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              showDiscussionDeepDive
                                ? "rotate-180"
                                : "rotate-0",
                            )}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-4">
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
                                {section?.title ??
                                  `Cluster ${sectionIndex + 1}`}
                              </div>
                              {sectionItems.length ? (
                                <Badge
                                  variant="outline"
                                  className="text-[11px]"
                                >
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
                                      {Array.isArray(item?.references) &&
                                      item.references.length ? (
                                        <div className="text-[11px] text-muted-foreground">
                                          References:{" "}
                                          {item.references.join(", ")}
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })
                              ) : (
                                <InfoNotice tone="info" size="xs">
                                  No individual signals captured for this
                                  cluster yet.
                                </InfoNotice>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {showDiscussionSamples && hasDiscussionThreads ? (
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
                          <TableHead className="min-w-[140px]">
                            Signals
                          </TableHead>
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
          step="Step 7"
          title="Comprehensive report"
          description="Merge product narrative, community intelligence, and discussion signals into a single plan."
          status={reportStatusDisplay}
          metrics={[
            {
              label: "Actions",
              value: hasFinalReport ? COUNT_FORMATTER.format(actionCount) : "0",
              tone: hasFinalReport ? "positive" : "warning",
            },
            {
              label: "Highlights",
              value: COUNT_FORMATTER.format(headlineCount),
              tone: headlineCount ? "positive" : "neutral",
            },
            {
              label: "Last refreshed",
              value: lastReportGenerated,
              tone: lastReportGenerated === "Never" ? "warning" : "neutral",
            },
          ]}
          collapsible
          defaultOpen={shouldOpenReportStage}
        >
          <>
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span>Since last run:</span>
                  <span>
                    {hasFinalReport
                      ? `${COUNT_FORMATTER.format(actionCount)} actions prioritized`
                      : "Report generation pending"}
                  </span>
                </div>
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
                          {recommendedActions
                            .slice(0, 2)
                            .map((action, index) => {
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
                            {COUNT_FORMATTER.format(actionCount - 2)} more
                            action
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
                            discussion stages finish to generate the
                            comprehensive plan.
                          </InfoNotice>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {orderedRecommendedActions.length ? (
                <section
                  ref={recommendedActionsRef}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
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
                      {COUNT_FORMATTER.format(orderedRecommendedActions.length)}{" "}
                      action
                      {orderedRecommendedActions.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {orderedRecommendedActions.map((action, index) => {
                      const priority = ACTION_PRIORITY_BADGE[action.priority]
                      const priorityIcon = ACTION_PRIORITY_ICON[action.priority]
                      const timeframeLabel = formatActionTimeframe(
                        action.timeframe,
                      )
                      const description =
                        typeof action.description === "string"
                          ? action.description.trim()
                          : ""
                      const descriptionPreview = description
                        ? description.length > 120
                          ? `${description.slice(0, 120)}…`
                          : description
                        : "Open to view the full play."
                      const successMetric = action.successMetric?.trim() || null
                      const rationale = action.rationale?.trim() || null
                      const supportingSignals = Array.isArray(
                        action.supportingSignals,
                      )
                        ? action.supportingSignals.filter(
                            (signal): signal is string =>
                              typeof signal === "string" &&
                              signal.trim().length > 0,
                          )
                        : []

                      return (
                        <Collapsible
                          key={`action-${index}`}
                          defaultOpen={index === 0}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                                {priorityIcon}
                              </span>
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-foreground">
                                  {action.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {descriptionPreview}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {priority ? (
                                <Badge
                                  variant={priority.badge}
                                  className="text-[11px]"
                                >
                                  {priority.label}
                                </Badge>
                              ) : null}
                              {timeframeLabel ? (
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  {timeframeLabel}
                                </span>
                              ) : null}
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                >
                                  View play
                                  <ChevronDownIcon
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                </button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                          <CollapsibleContent className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                            <div className="text-sm text-muted-foreground">
                              {description ||
                                "No detailed guidance provided yet."}
                            </div>
                            {successMetric ? (
                              <div className="text-xs text-primary">
                                Success metric: {successMetric}
                              </div>
                            ) : null}
                            {rationale ? (
                              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">
                                  Why this matters
                                </div>
                                <div className="mt-1 leading-relaxed">
                                  {rationale}
                                </div>
                              </div>
                            ) : null}
                            {supportingSignals.length ? (
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="font-semibold uppercase tracking-wide text-muted-foreground">
                                  Backed by customer signals
                                </div>
                                <ul className="list-disc space-y-1 pl-4">
                                  {supportingSignals.map(
                                    (signal, signalIndex) => (
                                      <li
                                        key={`action-${index}-signal-${signalIndex}`}
                                      >
                                        {signal}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            ) : null}
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {opportunityAreas.length ||
              customerSignals.length ||
              communityPlan.length ||
              metricsToWatch.length ? (
                <Collapsible
                  open={showReportDeepDive}
                  onOpenChange={setShowReportDeepDive}
                  className="space-y-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Supporting insight detail
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expand for the evidence that backs the recommended
                        actions.
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        {showReportDeepDive
                          ? "Hide supporting detail"
                          : "Show supporting detail"}
                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            showReportDeepDive ? "rotate-180" : "rotate-0",
                          )}
                          aria-hidden
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    {opportunityAreas.length ? (
                      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              Opportunity areas
                            </div>
                            <div className="text-xs text-muted-foreground">
                              The biggest positioning gaps and growth angles
                              from the synthesized report.
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="self-start text-[11px]"
                          >
                            {COUNT_FORMATTER.format(opportunityAreas.length)}{" "}
                            area
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
                                    <li
                                      key={`opportunity-${index}-${itemIndex}`}
                                    >
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
                              Synthesized evidence from discussions,
                              testimonials, and product reviews.
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="self-start text-[11px]"
                          >
                            {COUNT_FORMATTER.format(customerSignals.length)}{" "}
                            section
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
                                    <li key={`signal-${index}-${itemIndex}`}>
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

                    {communityPlan.length ? (
                      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              Community plan
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Outreach objectives tailored to the communities
                              uncovered earlier in the pipeline.
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="self-start text-[11px]"
                          >
                            {COUNT_FORMATTER.format(communityPlan.length)}{" "}
                            objective
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
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px]"
                                  >
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
                              {Array.isArray(plan.tactics) &&
                              plan.tactics.length ? (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                  {plan.tactics.map((tactic, tacticIndex) => (
                                    <li
                                      key={`community-${index}-${tacticIndex}`}
                                    >
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
                            {COUNT_FORMATTER.format(metricsToWatch.length)}{" "}
                            metric
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
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          </>
        </StageCard>
      </div>
    </>
  )
}
