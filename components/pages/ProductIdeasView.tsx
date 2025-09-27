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

import {
  refreshProductIdeaDiscussions,
  refreshProductIdeaProfile,
  refreshProductIdeaSubreddits,
} from "@/actions/member/products/ideas"
import type {
  ProductIdeaProfileStatus,
  ProductIdeaRedditDiscussionQuery,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
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

const DEFAULT_PROFILE_MODEL = "gpt-4.1-mini"

const DEFAULT_SUBREDDIT_MODEL = "gpt-4.1-mini"

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
  const [isRefreshing, startTransition] = useTransition()
  const [subredditProgress, setSubredditProgress] = useState<string | null>(
    null,
  )
  const [isDiscoveringSubreddits, startSubredditTransition] = useTransition()
  const [discussionProgress, setDiscussionProgress] = useState<string | null>(
    null,
  )
  const [isDiscoveringDiscussions, startDiscussionTransition] = useTransition()

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

  const handleRefresh = () => {
    startTransition(async () => {
      setProgressMessage("Starting crawl and synthesis…")
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              status: "pending",
              errorMessage: null,
              lastCrawledAt: prev.lastCrawledAt,
            }
          : prev,
      )
      try {
        setProgressMessage("Discovering sitemap and fetching pages…")
        const updated = await refreshProductIdeaProfile(slug)
        setProfile(updated)
        setProgressMessage("Summary generated successfully.")
        toast.success("Product profile updated")
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to refresh product profile"
        setProfile((prev) =>
          prev ? { ...prev, status: "failed", errorMessage: message } : prev,
        )
        setProgressMessage(
          "Crawler run failed. Check console logs for details.",
        )
        toast.error(message)
      }
    })
  }

  const handleDiscoverSubreddits = () => {
    startSubredditTransition(async () => {
      const shouldForceRefresh = Array.isArray(profile?.subreddits)
        ? (profile!.subreddits as ProductIdeaSubreddit[]).length > 0
        : false
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              subredditStatus: "pending",
              subredditErrorMessage: null,
            }
          : prev,
      )
      setSubredditProgress("Preparing Reddit discovery…")
      try {
        setSubredditProgress("Generating targeted search queries…")
        const updated = await refreshProductIdeaSubreddits(slug, {
          forceRefresh: shouldForceRefresh,
        })
        setProfile(updated)
        setSubredditProgress("Subreddit recommendations updated.")
        toast.success("Relevant subreddits discovered")
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to discover subreddits"
        setSubredditProgress(
          "Subreddit discovery failed. Check console logs for details.",
        )
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                subredditStatus: "failed",
                subredditErrorMessage: message,
              }
            : prev,
        )
        toast.error(message)
      }
    })
  }

  const handleDiscoverDiscussions = () => {
    startDiscussionTransition(async () => {
      const shouldForceRefresh = Array.isArray(profile?.redditDiscussions)
        ? (profile!.redditDiscussions as ProductIdeaRedditThread[]).length > 0
        : false
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              redditStatus: "pending",
              redditErrorMessage: null,
            }
          : prev,
      )
      setDiscussionProgress("Generating discussion search plan…")
      try {
        const updated = await refreshProductIdeaDiscussions(slug, {
          forceRefresh: shouldForceRefresh,
        })
        setProfile(updated)
        setDiscussionProgress("Reddit insights refreshed.")
        toast.success("Reddit discussion insights updated")
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to analyze Reddit discussions"
        setDiscussionProgress(
          "Discussion analysis failed. Check console logs for details.",
        )
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                redditStatus: "failed",
                redditErrorMessage: message,
              }
            : prev,
        )
        toast.error(message)
      }
    })
  }

  const statusDisplay = profile
    ? STATUS_STYLES[profile.status]
    : isRefreshing
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
    {
      label: "Model",
      value: profile?.model ?? DEFAULT_PROFILE_MODEL,
      tone: "neutral" as MetricTone,
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
    {
      label: "Model",
      value: profile?.subredditModel ?? DEFAULT_SUBREDDIT_MODEL,
      tone: "neutral" as MetricTone,
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

  const hasDiscoveredUrls = discoveredUrls.length > 0

  const renderCrawlerEmptyState = () => {
    if (profile || isRefreshing) return null
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Product profile
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold">
                  {productName}
                </CardTitle>
                <CardDescription className="text-sm">
                  <Link
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {websiteUrl}
                  </Link>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Badge variant={statusDisplay.badge}>{statusDisplay.label}</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing
                  ? "Refreshing…"
                  : profile
                    ? "Refresh profile"
                    : "Run crawler"}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {crawlerMetrics.map((metric) => (
              <MetricTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderCrawlerProgress()}
          {renderCrawlerError()}
          {renderCrawlerEmptyState()}
          {profile && !isRefreshing && !summary && (
            <InfoNotice tone="info" size="xs">
              We captured the crawl but did not synthesize a summary yet.
              Trigger another refresh if you recently updated the product site.
            </InfoNotice>
          )}
          {hasDiscoveredUrls && (
            <div className="space-y-2">
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
            </div>
          )}
        </CardContent>
      </Card>

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Product narrative</CardTitle>
            <CardDescription>
              Condensed from live website content and structured metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Reddit audience discovery</CardTitle>
              <CardDescription>
                Generate targeted search queries and capture the communities
                that discuss this product category.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={subredditStatusDisplay.badge}>
                {subredditStatusDisplay.label}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDiscoverSubreddits}
                disabled={isDiscoveringSubreddits}
              >
                {isDiscoveringSubreddits
                  ? "Discovering…"
                  : hasSubredditResults
                    ? "Rediscover subreddits"
                    : "Discover subreddits"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {subredditMetrics.map((metric) => (
              <MetricTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </div>
          {renderSubredditProgress()}
          {renderSubredditError()}
          {!hasSubredditResults && !isDiscoveringSubreddits && (
            <InfoNotice tone="info">
              Use the discovery tool to craft Reddit search queries, resolve the
              best-fit communities, and cache them for future research or
              outreach.
            </InfoNotice>
          )}
          {!!subredditQueries.length && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Generated search queries
              </div>
              <div className="flex flex-wrap gap-2">
                {subredditQueries.map((item) => (
                  <div
                    key={item.query}
                    className="max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <div className="font-medium text-foreground">
                      {item.query}
                    </div>
                    {item.rationale && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.rationale}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasSubredditResults && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Subreddit</TableHead>
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
                          href={subreddit.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Reddit discussion insights</CardTitle>
              <CardDescription>
                Surface the conversations that reveal wins, friction, and
                opportunities for this product.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={discussionStatusDisplay.badge}>
                {discussionStatusDisplay.label}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDiscoverDiscussions}
                disabled={isDiscoveringDiscussions}
              >
                {isDiscoveringDiscussions
                  ? "Analyzing…"
                  : hasDiscussionThreads || discussionInsights
                    ? "Refresh insights"
                    : "Analyze discussions"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {discussionMetrics.map((metric) => (
              <MetricTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </div>
          {renderDiscussionProgress()}
          {renderDiscussionError()}
          {!hasDiscussionThreads && !discussionInsights && !isDiscoveringDiscussions && (
            <InfoNotice tone="info">
              Run the analysis to gather recent Reddit threads that mention the
              product, comparable tools, and pain points. We will turn those
              into a focused insight report.
            </InfoNotice>
          )}
          {!!discussionQueries.length && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Discussion queries
              </div>
              <div className="flex flex-wrap gap-2">
                {discussionQueries.map((item) => (
                  <div
                    key={`${item.query}-${item.targetSubreddit ?? "global"}`}
                    className="max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <div className="font-medium text-foreground">
                      {item.query}
                    </div>
                    {item.targetSubreddit && (
                      <div className="mt-1 text-xs text-primary">
                        Focus: r/{item.targetSubreddit.replace(/^r\//i, "")}
                      </div>
                    )}
                    {item.rationale && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.rationale}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {discussionInsights && (
            <div className="space-y-4">
              {discussionInsights.summary && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {discussionInsights.summary}
                </div>
              )}
              {!!(discussionInsights.recommendedFocus?.length ?? 0) && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Recommended focus
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {discussionInsights.recommendedFocus!.map((item, index) => (
                      <li key={`focus-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-4">
                {discussionInsights.sections?.length ? (
                  discussionInsights.sections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`} className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">
                        {section.title}
                      </div>
                      {section.description && (
                        <div className="text-sm text-muted-foreground">
                          {section.description}
                        </div>
                      )}
                      <div className="space-y-3">
                        {section.items.map((item, itemIndex) => {
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
                          )
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <InfoNotice tone="info" size="xs">
                    We did not identify specific insight sections from the
                    sampled threads yet. Try rerunning the analysis with a
                    refreshed crawl or broadened subreddit list.
                  </InfoNotice>
                )}
              </div>
            </div>
          )}
          {hasDiscussionThreads && (
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
          )}
        </CardContent>
      </Card>

      {!!pageCount && (
        <Card>
          <CardHeader>
            <CardTitle>Crawled pages</CardTitle>
            <CardDescription>
              URLs sourced from the sitemap. We capture metadata and key copy
              blocks for analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[180px]">Title</TableHead>
                    <TableHead className="min-w-[320px]">
                      Summary snippet
                    </TableHead>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
