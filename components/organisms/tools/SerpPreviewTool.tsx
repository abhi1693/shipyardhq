"use client"

import { useState } from "react"
import {
  CircleCheck,
  Code2,
  LoaderCircle,
  Monitor,
  Search,
  Smartphone,
} from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { cn } from "@/lib/utils"

import {
  CopyableCode,
  CopyTextButton,
  ToolField,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

const TITLE_MIN = 30
const TITLE_MAX = 60
const DESCRIPTION_MIN = 120
const DESCRIPTION_MAX = 160

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function getUrlParts(value: string) {
  try {
    const url = new URL(normalizeUrl(value))
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol")
    }
    return {
      valid: true,
      canonical: url.toString(),
      host: url.hostname.replace(/^www\./, ""),
      path: url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""),
    }
  } catch {
    return { valid: false, canonical: "", host: "yourproduct.com", path: "" }
  }
}

function lengthStatus(
  length: number,
  min: number,
  max: number,
): { label: string; tone: "good" | "warning" | "neutral" } {
  if (!length) return { label: "Start typing", tone: "neutral" }
  if (length < min) return { label: "Add more detail", tone: "warning" }
  if (length > max) return { label: "May be truncated", tone: "warning" }
  return { label: "Good length", tone: "good" }
}

function LengthGuide({
  id,
  length,
  min,
  max,
  status,
}: {
  id: string
  length: number
  min: number
  max: number
  status: ReturnType<typeof lengthStatus>
}) {
  const percent = Math.min(100, Math.round((length / max) * 100))
  const isOver = length > max

  return (
    <div id={id} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            status.tone === "good"
              ? "text-emerald-700"
              : status.tone === "warning"
                ? "text-amber-700"
                : "text-slate-500",
          )}
        >
          {status.tone === "good" ? (
            <CircleCheck className="size-3.5" aria-hidden="true" />
          ) : null}
          {status.label}
        </span>
        <span className="text-slate-500 tabular-nums">
          {length} characters · recommended {min}–{max}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${length} characters; recommended range ${min} to ${max}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(length, max)}
      >
        <div
          className={cn(
            "h-full rounded-full",
            isOver
              ? "bg-red-500"
              : status.tone === "good"
                ? "bg-emerald-500"
                : status.tone === "warning"
                  ? "bg-amber-400"
                  : "bg-slate-300",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function SerpPreviewTool() {
  const [title, setTitle] = useState(
    "Shipyard — Discover and launch outstanding products",
  )
  const [description, setDescription] = useState(
    "Discover new SaaS, AI tools, apps, and developer products. Launch your own product, meet early users, and learn what gets their attention.",
  )
  const [pageUrl, setPageUrl] = useState("https://shipyardhq.dev/products")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  )
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState("")

  async function fetchMetadata() {
    if (!url.valid) return
    setFetching(true)
    setFetchError("")
    try {
      const response = await fetch("/api/tools/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [pageUrl], includeSiteFiles: false }),
      })
      const data = (await response.json()) as {
        error?: string
        results?: Array<{
          error?: string
          audit?: {
            title: string
            description: string
            canonical: string
            finalUrl: string
          }
        }>
      }
      const result = data.results?.[0]
      if (!response.ok || !result?.audit) {
        throw new Error(
          result?.error || data.error || "Metadata could not be fetched.",
        )
      }
      setTitle(result.audit.title)
      setDescription(result.audit.description)
      setPageUrl(result.audit.canonical || result.audit.finalUrl)
    } catch (error) {
      setFetchError(
        error instanceof Error
          ? error.message
          : "Metadata could not be fetched.",
      )
    } finally {
      setFetching(false)
    }
  }

  const titleState = lengthStatus(title.length, TITLE_MIN, TITLE_MAX)
  const descriptionState = lengthStatus(
    description.length,
    DESCRIPTION_MIN,
    DESCRIPTION_MAX,
  )
  const url = getUrlParts(pageUrl)
  const completeFields = [title.trim(), description.trim(), url.valid].filter(
    Boolean,
  ).length
  const metaTags = [
    title.trim() ? `<title>${escapeHtml(title.trim())}</title>` : "",
    description.trim()
      ? `<meta name="description" content="${escapeHtml(description.trim())}" />`
      : "",
    url.valid
      ? `<link rel="canonical" href="${escapeHtml(url.canonical)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <ToolWorkspaceGrid className="lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)] [&>*]:min-w-0">
      <ToolPanel
        id="serp-input"
        title="Page metadata"
        description="Write the search title, description, and preferred URL for this page."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!url.valid || fetching}
              onClick={() => void fetchMetadata()}
            >
              {fetching ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Search aria-hidden />
              )}
              {fetching ? "Fetching…" : "Fetch from URL"}
            </Button>
            <ToolStatusBadge tone={completeFields === 3 ? "good" : "warning"}>
              {completeFields}/3 complete
            </ToolStatusBadge>
          </div>
        }
      >
        <div className="space-y-6">
          <ToolField
            htmlFor="serp-title"
            label="SEO title"
            required
            error={
              !title.trim()
                ? "Add a title to generate the title tag."
                : undefined
            }
          >
            <Input
              id="serp-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Your product — A clear benefit"
              aria-invalid={!title.trim()}
              aria-describedby={
                !title.trim()
                  ? "serp-title-guidance serp-title-error"
                  : "serp-title-guidance"
              }
              className="h-11 rounded-lg border-slate-300 bg-white px-3.5"
              maxLength={120}
            />
            <LengthGuide
              id="serp-title-guidance"
              length={title.length}
              min={TITLE_MIN}
              max={TITLE_MAX}
              status={titleState}
            />
          </ToolField>

          <ToolField
            htmlFor="serp-description"
            label="Meta description"
            required
            error={
              !description.trim()
                ? "Add a description to generate the description tag."
                : undefined
            }
          >
            <Textarea
              id="serp-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain what the page offers and who it helps."
              aria-invalid={!description.trim()}
              aria-describedby={
                !description.trim()
                  ? "serp-description-guidance serp-description-error"
                  : "serp-description-guidance"
              }
              className="min-h-32 resize-y rounded-lg border-slate-300 bg-white px-3.5 py-3 leading-6"
              maxLength={300}
            />
            <LengthGuide
              id="serp-description-guidance"
              length={description.length}
              min={DESCRIPTION_MIN}
              max={DESCRIPTION_MAX}
              status={descriptionState}
            />
          </ToolField>

          <ToolField
            htmlFor="serp-url"
            label="Canonical page URL"
            required
            error={
              pageUrl.trim() && !url.valid
                ? "Enter a valid web address, such as https://example.com/product."
                : !pageUrl.trim()
                  ? "Add the preferred URL for this page."
                  : undefined
            }
          >
            <Input
              id="serp-url"
              type="url"
              inputMode="url"
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="https://example.com/product"
              aria-invalid={!pageUrl.trim() || !url.valid}
              aria-describedby={
                !pageUrl.trim() || !url.valid
                  ? "serp-url-error"
                  : "serp-url-guidance"
              }
              className="h-11 rounded-lg border-slate-300 bg-white px-3.5"
            />
            {url.valid ? (
              <p
                id="serp-url-guidance"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
              >
                <CircleCheck className="size-3.5" aria-hidden="true" />
                Valid canonical URL
              </p>
            ) : null}
            {fetchError ? (
              <p className="text-xs leading-5 text-red-700">{fetchError}</p>
            ) : null}
          </ToolField>
        </div>
      </ToolPanel>

      <ToolPanel
        id="serp-output"
        title="Live search preview"
        description="A close visual guide; Google may rewrite the result for a specific query."
        action={
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
            role="group"
            aria-label="Preview device"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={previewMode === "desktop"}
              onClick={() => setPreviewMode("desktop")}
              className={cn(
                "h-8 rounded-md px-2.5",
                previewMode === "desktop" &&
                  "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
              )}
            >
              <Monitor aria-hidden="true" />
              Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={previewMode === "mobile"}
              onClick={() => setPreviewMode("mobile")}
              className={cn(
                "h-8 rounded-md px-2.5",
                previewMode === "mobile" &&
                  "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
              )}
            >
              <Smartphone aria-hidden="true" />
              Mobile
            </Button>
          </div>
        }
      >
        <div aria-live="polite">
          <div className="rounded-xl bg-slate-100 p-4 sm:p-6">
            <div
              className={cn(
                "mx-auto border border-slate-200 bg-white p-5 sm:p-6",
                previewMode === "mobile"
                  ? "max-w-sm rounded-2xl"
                  : "w-full rounded-xl",
              )}
            >
              <div className="mb-3 flex items-center gap-2.5 text-slate-700">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Search className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {url.host}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {url.valid
                      ? `${url.host}${url.path || "/"}`
                      : "yourproduct.com/launch"}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "text-pretty font-medium leading-7 text-blue-800",
                  previewMode === "mobile"
                    ? "line-clamp-2 text-lg"
                    : "line-clamp-1 text-xl",
                )}
              >
                {title.trim() || "Your SEO title will appear here"}
              </p>
              <p
                className={cn(
                  "mt-1.5 text-pretty text-sm leading-5 text-slate-700",
                  previewMode === "mobile" ? "line-clamp-3" : "line-clamp-2",
                )}
              >
                {description.trim() ||
                  "Add a meta description to preview the summary searchers may see."}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Code2 className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="text-balance text-sm font-semibold text-slate-950">
                    Ready-to-paste meta tags
                  </h4>
                  <p className="mt-1 text-pretty text-xs leading-5 text-slate-500">
                    Add these once inside the page&apos;s head element.
                  </p>
                </div>
              </div>
              <CopyTextButton
                text={metaTags}
                label="Copy tags"
                disabled={!metaTags}
              />
            </div>
            <CopyableCode
              code={metaTags}
              label="HTML meta tags"
              showHeader={false}
            />
          </div>
        </div>
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
