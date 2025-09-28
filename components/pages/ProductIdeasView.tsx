"use client"

import {
  useMemo,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"

import { scheduleProductIdeaInsightsPipeline } from "@/actions/member/products/ideas"
import type {
  ProductIdeaComprehensiveReport,
  ProductIdeaProfileStatus,
  ProductIdeaRedditDiscussionQuery,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaReportActionPriority,
  ProductIdeaSubreddit,
  ProductIdeaSubredditQuery,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import type {
  ProductIdeaPageSnapshot,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
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
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<
  ProductIdeaProfileStatus,
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

const ACTION_PRIORITY_BADGE: Record<
  ProductIdeaReportActionPriority,
  { label: string; badge: ComponentProps<typeof Badge>["variant"] }
> = {
  high: { label: "High priority", badge: "destructive" },
  medium: { label: "Medium priority", badge: "secondary" },
  low: { label: "Low priority", badge: "outline" },
  watch: { label: "Monitor", badge: "secondary" },
}

type ProductIdeasViewProps = {
  slug: string
  productName: string
  websiteUrl: string
  initialProfile: SerializedIdeaProfile | null
}

type SummarySection = {
  title: string
  items: string[]
}

type MetricTone = "neutral" | "positive" | "warning" | "danger"

const METRIC_TONE_STYLES: Record<MetricTone, string> = {
  neutral: "text-foreground",
  positive: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
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
  metrics?: ReadonlyArray<{ label: string; value: ReactNode; tone?: MetricTone }>
  children: ReactNode
}

function StageCard({
  step,
  title,
  description,
  status,
  actions,
  metrics,
  children,
}: StageCardProps) {
  return (
    <Card>
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
      <CardContent className="space-y-6">{children}</CardContent>
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    <dd className="font-medium text-foreground">{metric.value}</dd>
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

export function ProductIdeasView({
  slug,
  productName,
  websiteUrl,
  initialProfile,
}: ProductIdeasViewProps) {
  const [profile, setProfile] = useState<SerializedIdeaProfile | null>(
    initialProfile,
  )
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [subredditProgress, setSubredditProgress] = useState<string | null>(
    null,
  )
  const [discussionProgress, setDiscussionProgress] = useState<string | null>(
    null,
  )
  const [reportProgress, setReportProgress] = useState<string | null>(null)
  const [pipelineNotice, setPipelineNotice] = useState<
    { tone: "info" | "error"; message: string } | null
  >(null)
  const [isRunningPipeline, startPipelineTransition] = useTransition()

  const summary = (profile?.summary || undefined) as
    | ProductIdeaSummary
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
      ? (profile!.pages as ProductIdeaPageSnapshot[])
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
    setSubredditProgress("Preparing Reddit discovery…")
    setDiscussionProgress("Queued for discussion analysis…")
    setReportProgress("Queued for comprehensive report…")

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            status: "pending",
            errorMessage: null,
            subredditStatus: "pending",
            subredditErrorMessage: null,
            redditStatus: "pending",
            redditErrorMessage: null,
            finalReportStatus: "pending",
            finalReportErrorMessage: null,
          }
        : prev,
    )

    startPipelineTransition(async () => {
      try {
        const result = await scheduleProductIdeaInsightsPipeline(slug)
        setProfile(result.profile)

        if (result.executedInline) {
          setProgressMessage("Latest crawl captured and summarized.")
          setSubredditProgress("Subreddit recommendations refreshed.")
          setDiscussionProgress("Reddit discussion insights updated.")
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
          setSubredditProgress("Reddit discovery will run once the queue processes.")
          setDiscussionProgress("Discussion analysis will start automatically.")
          setReportProgress("Report synthesis will begin after upstream steps finish.")
          setPipelineNotice({
            tone: "info",
            message: result.duplicate
              ? "Insights pipeline is already running. We'll let you know when it's ready."
              : "Pipeline queued successfully. We'll email you when the insights are ready.",
          })
          toast.success(
            result.duplicate
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
        setSubredditProgress(null)
        setDiscussionProgress(null)
        setReportProgress(null)
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

  const discoveredUrls = Array.isArray(profile?.discoveredUrls)
    ? (profile!.discoveredUrls as string[])
    : []

  const subredditQueries = useMemo(() => {
    return Array.isArray(profile?.subredditQueries)
      ? (profile!.subredditQueries as ProductIdeaSubredditQuery[])
      : []
  }, [profile])

  const subreddits = useMemo(() => {
    return Array.isArray(profile?.subreddits)
      ? (profile!.subreddits as ProductIdeaSubreddit[])
      : []
  }, [profile])

  const hasSubredditResults = subreddits.length > 0

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
      ? (profile!.redditDiscussionQueries as ProductIdeaRedditDiscussionQuery[])
      : []
  }, [profile])

  const discussionThreads = useMemo(() => {
    return Array.isArray(profile?.redditDiscussions)
      ? (profile!.redditDiscussions as ProductIdeaRedditThread[])
      : []
  }, [profile])

  const discussionInsights =
    (profile?.redditInsights as ProductIdeaRedditInsightReport | null) ?? null

  const hasDiscussionThreads = discussionThreads.length > 0

  const totalCommentsSampled = discussionThreads.reduce((sum, thread) => {
    const commentCount = thread.topComments?.length ?? 0
    return sum + commentCount
  }, 0)

  const totalFocusAreas = discussionInsights?.recommendedFocus?.length ?? 0

  const discussionStatus = profile?.redditStatus ?? null
  const discussionStatusDisplay = discussionStatus
    ? STATUS_STYLES[discussionStatus]
    : { label: "Not started", badge: "outline" as const }

  const lastDiscussionDiscovery = profile?.lastRedditDiscoveryAt
    ? formatDistanceToNowStrict(new Date(profile.lastRedditDiscoveryAt), {
        addSuffix: true,
      })
    : "Never"

  const crawlerMetrics = [
    {
      label: "Last crawled",
      value: lastCrawled,
      tone: profile ? "neutral" : "warning",
    },
    {
      label: "Pages captured",
      value: profile ? (pageCount ? pageCount.toString() : "0") : "—",
      tone: profile ? (pageCount ? "neutral" : "warning") : "neutral",
    },
    {
      label: "Errors",
      value: profile
        ? erroredPages.length
          ? `${erroredPages.length}`
          : "0"
        : "—",
      tone: profile
        ? erroredPages.length
          ? ("danger" as MetricTone)
          : ("positive" as MetricTone)
        : "neutral",
    },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: string
    tone: MetricTone
  }>

  const subredditMetrics = [
    {
      label: "Last discovered",
      value: lastSubredditDiscovery,
      tone: profile ? "neutral" : "warning",
    },
    {
      label: "Saved communities",
      value: profile
        ? hasSubredditResults
          ? `${subreddits.length}`
          : "0"
        : "—",
      tone: profile
        ? hasSubredditResults
          ? "positive"
          : "warning"
        : "neutral",
    },
    {
      label: "Queries generated",
      value: profile
        ? subredditQueries.length
          ? `${subredditQueries.length}`
          : "0"
        : "—",
      tone: profile
        ? subredditQueries.length
          ? "neutral"
          : "warning"
        : "neutral",
    },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: string
    tone: MetricTone
  }>

  const discussionMetrics = [
    {
      label: "Last analyzed",
      value: lastDiscussionDiscovery,
      tone: profile ? "neutral" : "warning",
    },
    {
      label: "Threads captured",
      value: profile
        ? hasDiscussionThreads
          ? `${discussionThreads.length}`
          : "0"
        : "—",
      tone: profile
        ? hasDiscussionThreads
          ? "positive"
          : "warning"
        : "neutral",
    },
    {
      label: "Comments sampled",
      value: profile
        ? totalCommentsSampled
          ? `${totalCommentsSampled}`
          : "0"
        : "—",
      tone: profile
        ? totalCommentsSampled
          ? "neutral"
          : "warning"
        : "neutral",
    },
    {
      label: "Focus areas",
      value: discussionInsights
        ? totalFocusAreas
          ? `${totalFocusAreas}`
          : "0"
        : "—",
      tone: discussionInsights
        ? totalFocusAreas
          ? "positive"
          : "warning"
        : "neutral",
    },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: string
    tone: MetricTone
  }>

  const finalReport =
    (profile?.finalReport as ProductIdeaComprehensiveReport | null) ?? null
  const reportStatus = profile?.finalReportStatus ?? null
  const reportStatusDisplay = reportStatus
    ? STATUS_STYLES[reportStatus]
    : { label: "Not started", badge: "outline" as const }
  const lastReportGenerated = profile?.lastFinalReportAt
    ? formatDistanceToNowStrict(new Date(profile.lastFinalReportAt), {
        addSuffix: true,
      })
    : "Never"
  const headlineCount = finalReport?.headlineHighlights?.length ?? 0
  const actionCount = finalReport?.recommendedActions?.length ?? 0
  const opportunityCount = finalReport?.opportunityAreas?.length ?? 0
  const hasFinalReport = Boolean(finalReport)

  const reportMetrics = [
    {
      label: "Last generated",
      value: lastReportGenerated,
      tone: hasFinalReport ? "neutral" : "warning",
    },
    {
      label: "Highlights",
      value: headlineCount ? `${headlineCount} key points` : "—",
      tone: headlineCount ? "positive" : "neutral",
    },
    {
      label: "Recommended actions",
      value: actionCount ? `${actionCount} actions` : "—",
      tone: actionCount >= 3 ? "positive" : actionCount ? "neutral" : "warning",
    },
    {
      label: "Opportunity areas",
      value: opportunityCount ? `${opportunityCount} focus areas` : "—",
      tone: opportunityCount ? "neutral" : "warning",
    },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: string
    tone: MetricTone
  }>

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
      title: "Audience discovery",
      description: "Find active Reddit communities for this product space.",
      status: subredditStatusDisplay,
      metrics: [
        { label: "Last pass", value: lastSubredditDiscovery },
        {
          label: "Communities",
          value: profile ? (hasSubredditResults ? `${subreddits.length}` : "0") : "—",
        },
      ],
    },
    {
      step: "Step 3",
      title: "Discussion insights",
      description: "Pull live conversations to reveal wins and friction.",
      status: discussionStatusDisplay,
      metrics: [
        { label: "Last pass", value: lastDiscussionDiscovery },
        {
          label: "Threads",
          value: profile ? (hasDiscussionThreads ? `${discussionThreads.length}` : "0") : "—",
        },
      ],
    },
    {
      step: "Step 4",
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

  const hasDiscoveredUrls = discoveredUrls.length > 0

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
    return <InfoNotice tone="error">{profile.finalReportErrorMessage}</InfoNotice>
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
              Refresh the crawl, subreddit discovery, discussion insights, and report in one click.
            </CardDescription>
          </div>
          <Button
            onClick={handleRunPipeline}
            disabled={isRunningPipeline}
            className="w-full sm:w-auto"
          >
            {isRunningPipeline ? "Running pipeline…" : "Run full pipeline"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div>Last report generated: {lastReportGenerated}</div>
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

      <FlowOverview stages={flowStageSummaries} />

      <StageCard
        step="Step 1"
        title="Product foundation"
        description="The pipeline crawler captures live messaging and structure for this product."
        status={statusDisplay}
        metrics={crawlerMetrics}
      >
        <>
          <section className="space-y-1">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Product
            </div>
            <div className="text-xl font-semibold text-foreground">{productName}</div>
            <Link
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {websiteUrl}
            </Link>
          </section>

          {renderCrawlerProgress()}
          {renderCrawlerError()}
          {renderCrawlerEmptyState()}

          {profile && !isRunningPipeline && !summary && (
            <InfoNotice tone="info" size="xs">
              We captured the crawl but did not synthesize a summary yet. Run
              the full pipeline again if you recently updated the product site.
            </InfoNotice>
          )}

          {summary && (
            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Product narrative
                </div>
                <div className="text-xs text-muted-foreground">
                  Condensed from live website content and structured metadata.
                </div>
              </div>
              {summary.overview && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {summary.overview}
                </div>
              )}
              {!!summarySections.length && (
                <div className="grid gap-4 md:grid-cols-2">
                  {summarySections.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <div className="text-sm font-semibold text-foreground">
                        {section.title}
                      </div>
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {section.items.map((item, index) => (
                          <li key={`${section.title}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {hasDiscoveredUrls && (
            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Sitemap sources
              </div>
              <div className="flex flex-wrap gap-2">
                {discoveredUrls.map((url) => (
                  <Link
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    {url}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!!pageCount && (
            <section className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Crawl inventory
                </div>
                <div className="text-xs text-muted-foreground">
                  URLs sourced from the sitemap. We capture metadata and key copy blocks for analysis.
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[180px]">Title</TableHead>
                      <TableHead className="min-w-[320px]">Summary snippet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.url}>
                        <TableCell className="max-w-[18rem] whitespace-normal break-words">
                          <Link
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {page.url}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {page.status === "ok" ? (
                            <Badge variant="success">OK</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[16rem] whitespace-normal break-words">
                          {page.title || "—"}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-muted-foreground">
                          {page.textSnippet
                            ? page.textSnippet.length > 220
                              ? `${page.textSnippet.slice(0, 220)}…`
                              : page.textSnippet
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption>
                    {erroredPages.length
                      ? `${erroredPages.length} page${erroredPages.length === 1 ? "" : "s"} failed during crawl`
                      : `Fetched ${pageCount} page${pageCount === 1 ? "" : "s"}`}
                  </TableCaption>
                </Table>
              </div>
            </section>
          )}
        </>
      </StageCard>

      <StageCard
        step="Step 2"
        title="Audience discovery"
        description="The pipeline generates Reddit search plans and captures the communities that match this product."
        status={subredditStatusDisplay}
        metrics={subredditMetrics}
      >
        <>
          {renderSubredditProgress()}
          {renderSubredditError()}
          {!hasSubredditResults && !isRunningPipeline && (
            <InfoNotice tone="info">
              Run the full pipeline to craft Reddit search queries, resolve the
              best-fit communities, and cache them for future research or
              outreach.
            </InfoNotice>
          )}
          {!!subredditQueries.length && (
            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Generated search queries
              </div>
              <div className="flex flex-wrap gap-2">
                {subredditQueries.map((item) => (
                  <div
                    key={item.query}
                    className="max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <div className="font-medium text-foreground">{item.query}</div>
                    {item.rationale && (
                      <div className="mt-1 text-xs text-muted-foreground">{item.rationale}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {hasSubredditResults && (
            <section className="space-y-3">
              <div className="text-sm font-semibold text-foreground">
                Saved communities
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Subreddit</TableHead>
                      <TableHead className="min-w-[280px]">What they discuss</TableHead>
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
                            href={subreddit.url ?? `https://reddit.com/r/${subreddit.name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-primary hover:underline"
                          >
                            r/{subreddit.name}
                          </Link>
                          {subreddit.over18 && (
                            <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                              18+
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                          <div>{subreddit.description || subreddit.title || "—"}</div>
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
          )}
        </>
      </StageCard>

      <StageCard
        step="Step 3"
        title="Discussion insights"
        description="Review Reddit conversations to surface wins, friction, and opportunities."
        status={discussionStatusDisplay}
        metrics={discussionMetrics}
      >
        <>
          {renderDiscussionProgress()}
          {renderDiscussionError()}
          {!hasDiscussionThreads && !isRunningPipeline && (
            <InfoNotice tone="info">
              Run the pipeline to sample the latest conversations from your
              saved communities.
            </InfoNotice>
          )}
          {!!discussionQueries.length && (
            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Discussion queries
              </div>
              <div className="flex flex-wrap gap-2">
                {discussionQueries.map((query) => (
                  <div
                    key={query.query}
                    className="max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <div className="font-medium text-foreground">{query.query}</div>
                    {query.rationale && (
                      <div className="mt-1 text-xs text-muted-foreground">{query.rationale}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {discussionInsights && (
            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Focus areas</div>
                <div className="text-xs text-muted-foreground">
                  Automatically grouped clusters summarizing what the community is talking about right now.
                </div>
              </div>
              {discussionInsights.recommendedFocus?.length ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {discussionInsights.recommendedFocus.map((item, index) => (
                    <li key={`focus-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <InfoNotice tone="info" size="xs">
                  No focus areas yet—try broadening the subreddit pool or rerunning the analysis later today.
                </InfoNotice>
              )}
              {discussionInsights.sections?.length ? (
                <div className="space-y-4">
                  {discussionInsights.sections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`} className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">
                        {section.title}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {section.items?.map((item, itemIndex) => {
                          const sentimentVariant = item.sentiment
                            ? SENTIMENT_BADGE_VARIANT[item.sentiment]
                            : null
                          const sentimentLabel = item.sentiment
                            ? SENTIMENT_BADGE_LABEL[item.sentiment]
                            : null
                          return (
                            <div
                              key={`${section.title}-${itemIndex}`}
                              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="text-sm font-medium text-foreground">
                                  {item.insight}
                                </div>
                                {sentimentVariant && sentimentLabel && (
                                  <Badge variant={sentimentVariant} className="text-[11px]">
                                    {sentimentLabel}
                                  </Badge>
                                )}
                              </div>
                              {item.audience && (
                                <div className="mt-1 text-xs text-primary">
                                  Audience: {item.audience}
                                </div>
                              )}
                              {!!(item.evidence?.length ?? 0) && (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                  {item.evidence!.map((evidence, evidenceIndex) => (
                                    <li key={`evidence-${sectionIndex}-${itemIndex}-${evidenceIndex}`}>
                                      {evidence}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {!!(item.references?.length ?? 0) && (
                                <div className="mt-2 text-[11px] text-muted-foreground">
                                  References: {item.references!.join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <InfoNotice tone="info" size="xs">
                  We did not identify specific insight sections from the sampled threads yet. Try rerunning the analysis with a refreshed crawl or broadened subreddit list.
                </InfoNotice>
              )}
            </section>
          )}
          {hasDiscussionThreads && (
            <section className="space-y-3">
              <div className="text-sm font-semibold text-foreground">
                Sampled discussions
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Discussion</TableHead>
                      <TableHead>Community</TableHead>
                      <TableHead className="min-w-[140px]">Signals</TableHead>
                      <TableHead className="min-w-[180px]">Matched queries</TableHead>
                      <TableHead className="min-w-[260px]">Top insight</TableHead>
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
                        ? formatDistanceToNowStrict(new Date(thread.createdAt), {
                            addSuffix: true,
                          })
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
                            {thread.flairText && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {thread.flairText}
                              </div>
                            )}
                            {relativeCreated && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {relativeCreated}
                              </div>
                            )}
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
                                  {topComment?.author && <span>by {topComment.author}</span>}
                                  {typeof topComment?.score === "number" && (
                                    <span>{topComment.score} upvotes</span>
                                  )}
                                  {additionalComments > 0 && (
                                    <span>+{additionalComments} more</span>
                                  )}
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
          )}
        </>
      </StageCard>

      <StageCard
        step="Step 4"
        title="Comprehensive report"
        description="Merge product narrative, community intelligence, and Reddit signals into a single plan."
        status={reportStatusDisplay}
        metrics={reportMetrics}
      >
        <>
          <div className="text-xs text-muted-foreground">
            Last generated: {lastReportGenerated}
          </div>
          {renderReportProgress()}
          {renderReportError()}
          {!hasFinalReport && !isRunningPipeline && (
            <InfoNotice tone="info">
              Run the pipeline after the profile and Reddit insights are ready to
              generate the comprehensive report that combines every section into
              a single focus plan.
            </InfoNotice>
          )}
          {finalReport && (
            <section className="space-y-6">
              {finalReport.executiveSummary && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {finalReport.executiveSummary}
                </div>
              )}
              {!!(finalReport.headlineHighlights?.length ?? 0) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Headline highlights
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {finalReport.headlineHighlights.map((highlight, index) => (
                      <li key={`headline-${index}`}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!(finalReport.opportunityAreas?.length ?? 0) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Opportunity areas
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {finalReport.opportunityAreas.map((area, index) => (
                      <div
                        key={`opportunity-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {area.title}
                        </div>
                        {area.summary && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {area.summary}
                          </div>
                        )}
                        {!!(area.highlights?.length ?? 0) && (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {area.highlights.map((item, itemIndex) => (
                              <li key={`opportunity-${index}-${itemIndex}`}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!!(finalReport.customerSignals?.length ?? 0) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Customer signals
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {finalReport.customerSignals.map((section, index) => (
                      <div
                        key={`signal-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {section.title}
                        </div>
                        {section.summary && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {section.summary}
                          </div>
                        )}
                        {!!(section.highlights?.length ?? 0) && (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {section.highlights.map((item, itemIndex) => (
                              <li key={`signal-${index}-${itemIndex}`}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!!(finalReport.recommendedActions?.length ?? 0) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Recommended actions
                  </div>
                  <div className="space-y-3">
                    {finalReport.recommendedActions.map((action, index) => {
                      const priority = ACTION_PRIORITY_BADGE[action.priority]
                      const timeframeLabel = formatActionTimeframe(action.timeframe)
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
                              {timeframeLabel && (
                                <div className="text-xs text-primary">{timeframeLabel}</div>
                              )}
                            </div>
                            {priority && (
                              <Badge variant={priority.badge} className="text-[11px]">
                                {priority.label}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {action.description}
                          </div>
                          {action.rationale && (
                            <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-muted-foreground">
                              <div className="font-medium text-foreground">Why this matters</div>
                              <div className="mt-1 leading-relaxed">{action.rationale}</div>
                            </div>
                          )}
                          {action.successMetric && (
                            <div className="mt-2 text-[11px] text-primary">
                              Success metric: {action.successMetric}
                            </div>
                          )}
                          {!!(action.supportingSignals?.length ?? 0) && (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                              {action.supportingSignals!.map((signal, signalIndex) => (
                                <li key={`action-${index}-${signalIndex}`}>{signal}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!!(finalReport.communityPlan?.length ?? 0) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Community plan
                  </div>
                  <div className="space-y-3">
                    {finalReport.communityPlan!.map((plan, index) => (
                      <div
                        key={`community-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground">
                            {plan.objective}
                          </div>
                          {plan.successSignal && (
                            <Badge variant="secondary" className="text-[11px]">
                              Success signal: {plan.successSignal}
                            </Badge>
                          )}
                        </div>
                        {!!(plan.targetSubreddits?.length ?? 0) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Target communities: {plan.targetSubreddits.join(" • ")}
                          </div>
                        )}
                        {!!(plan.tactics?.length ?? 0) && (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {plan.tactics!.map((tactic, tacticIndex) => (
                              <li key={`community-${index}-${tacticIndex}`}>{tactic}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!!(finalReport.metricsToWatch?.length ?? 0) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Metrics to watch
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {finalReport.metricsToWatch!.map((metric, index) => (
                      <li key={`metric-${index}`}>{metric}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!(finalReport.supportingData?.length ?? 0) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Supporting data
                  </div>
                  <div className="space-y-2">
                    {finalReport.supportingData!.map((entry, index) => (
                      <div
                        key={`support-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-muted-foreground"
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {entry.label}
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {entry.entries.map((item, itemIndex) => (
                            <li key={`support-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      </StageCard>
    </div>
  )
}
