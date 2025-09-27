"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"

import { refreshProductIdeaProfile } from "@/actions/member/products/ideas"
import type {
  ProductIdeaProfileStatus,
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
import { Separator } from "@/components/atoms/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"

const STATUS_STYLES: Record<
  ProductIdeaProfileStatus,
  { label: string; badge: React.ComponentProps<typeof Badge>["variant"] }
> = {
  pending: { label: "Processing", badge: "secondary" },
  ready: { label: "Ready", badge: "success" },
  failed: { label: "Failed", badge: "destructive" },
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

  const erroredPages = useMemo(
    () => pages.filter((page) => page.status === "error"),
    [pages],
  )

  const handleRefresh = () => {
    startTransition(async () => {
      setProgressMessage("Starting crawl and synthesis…")
      setProfile((prev) =>
        prev
          ? { ...prev, status: "pending", errorMessage: null, lastCrawledAt: prev.lastCrawledAt }
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
          prev
            ? { ...prev, status: "failed", errorMessage: message }
            : prev,
        )
        setProgressMessage("Crawler run failed. Check console logs for details.")
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              Product Intelligence Snapshot
            </CardTitle>
            <CardDescription>
              {productName} •
              <Link
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                {websiteUrl}
              </Link>
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Badge variant={statusDisplay.badge}>{statusDisplay.label}</Badge>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : profile ? "Refresh profile" : "Run crawler"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Last crawled
              </div>
              <div className="text-sm text-foreground">{lastCrawled}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Model
              </div>
              <div className="text-sm text-foreground">
                {profile?.model ? profile.model : "gpt-4.1-mini"}
              </div>
            </div>
          </div>
          {profile?.errorMessage && (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {profile.errorMessage}
            </div>
          )}
          {progressMessage && (
            <div className="rounded border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
              {progressMessage}
            </div>
          )}
          {!profile && !isRefreshing && (
            <div className="rounded border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
              Run the crawler to capture a product profile from your live site. We
              will parse the sitemap, summarize the content, and store the
              highlights here for reuse.
            </div>
          )}
          {!profile && isRefreshing && (
            <div className="rounded border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
              Crawling site and synthesizing summary… this usually takes ~30 seconds.
            </div>
          )}
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Product Overview</CardTitle>
            <CardDescription>
              Condensed from live website content and structured metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {summary.overview}
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              {summarySections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {section.items.map((item, index) => (
                      <li key={`${section.title}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!!pages.length && (
        <Card>
          <CardHeader>
            <CardTitle>Crawled Pages</CardTitle>
            <CardDescription>
              URLs sourced from the sitemap. We capture page metadata, headings, and key copy blocks for analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-1/2">Summary snippet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.url}>
                    <TableCell className="max-w-[16rem] whitespace-normal break-words">
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
                        ? page.textSnippet.length > 180
                          ? `${page.textSnippet.slice(0, 180)}…`
                          : page.textSnippet
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                {erroredPages.length
                  ? `${erroredPages.length} page(s) failed during crawl`
                  : `Fetched ${pages.length} page(s)`}
              </TableCaption>
            </Table>
            {!!discoveredUrls.length && (
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                <div className="mb-2 font-medium uppercase tracking-wide text-slate-500">
                  Sitemap sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {discoveredUrls.map((url) => (
                    <Link
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-slate-200 bg-white px-2 py-1 hover:border-primary/60 hover:text-primary"
                    >
                      {url}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
