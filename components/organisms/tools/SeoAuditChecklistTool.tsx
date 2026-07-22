"use client"

import { useEffect, useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/atoms/button"

import {
  DownloadTextButton,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
} from "./ToolWorkspaceUi"

const STORAGE_KEY = "shipyard:seo-audit-checklist:v1"

const CHECKS = {
  "On-page": [
    "Each indexable page has a unique, descriptive title",
    "Meta descriptions explain the page outcome without duplication",
    "One primary heading clearly identifies the page topic",
    "Subheadings form a logical, non-skipping outline",
    "Canonical links point to the preferred public URL",
    "URLs are readable, durable, and consistently formatted",
    "Internal links connect related pages with descriptive anchors",
    "Images have useful alt text or an empty decorative alt",
    "Open Graph title, description, and image match the page",
    "X card metadata is present and previewed",
    "Visible contact, pricing, and product claims are accurate",
    "Structured data matches content visitors can see",
  ],
  Technical: [
    "Canonical pages return a successful 2xx response",
    "HTTP redirects once to the preferred HTTPS hostname",
    "Robots.txt allows required pages and assets",
    "Noindex is absent from pages intended for search",
    "XML sitemaps contain canonical, indexable URLs only",
    "Redirects point directly to the final destination",
    "Error pages return the correct 404 or 410 status",
    "Mobile viewport and responsive layouts are verified",
    "Core Web Vitals are reviewed with real-user data",
    "JavaScript rendering preserves metadata and main content",
    "Language and hreflang annotations are valid and reciprocal",
    "HTTPS certificates, mixed content, and security headers are checked",
  ],
  Content: [
    "The page fully answers one clear search intent",
    "Primary facts are current, specific, and supported",
    "Introductions explain who the page is for and why it matters",
    "Important entities and terminology appear naturally",
    "Repeated phrases are edited for clarity rather than density",
    "Screenshots, examples, or data add original value",
    "Authors and editorial responsibility are identifiable",
    "Dates are shown where freshness materially matters",
    "Thin, overlapping pages are consolidated or differentiated",
    "A useful next step is available after the reader's question is answered",
  ],
  Authority: [
    "Organization identity and ownership are clear",
    "Editorial, privacy, and terms pages are accessible",
    "Claims link to primary evidence where appropriate",
    "Unlinked brand mentions and earned links are reviewed",
    "Artificial, paid, or exchanged links are not presented as endorsements",
    "Profiles and citations use consistent product information",
    "User-generated content has moderation and spam controls",
    "Reputation issues have an owner and response process",
  ],
  Measurement: [
    "Search Console ownership is verified for every hostname",
    "Analytics excludes internal and test traffic where practical",
    "Conversions represent meaningful product outcomes",
    "Campaign URLs follow a consistent naming convention",
    "Sitemap coverage and indexing reasons are reviewed",
    "Queries and landing pages are compared by intent, not vanity totals",
    "Site changes include an annotation or deployment reference",
    "A recurring technical and content review has an owner",
  ],
} as const

type Category = keyof typeof CHECKS
const CATEGORIES = Object.keys(CHECKS) as Category[]
const ITEMS = CATEGORIES.flatMap((category) =>
  CHECKS[category].map((label, index) => ({
    id: `${category.toLowerCase().replaceAll(" ", "-")}-${index + 1}`,
    category,
    label,
  })),
)

export function SeoAuditChecklistTool() {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Category | "All">("All")
  const [show, setShow] = useState<"all" | "remaining" | "complete">("all")
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(STORAGE_KEY) ?? "[]",
        ) as unknown
        if (Array.isArray(stored))
          setCompleted(
            new Set(
              stored.filter((item): item is string => typeof item === "string"),
            ),
          )
      } catch {
        /* Ignore unavailable or corrupt local storage. */
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])
  function update(next: Set<string>) {
    setCompleted(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      /* Progress still works for this tab. */
    }
  }
  function toggle(id: string) {
    const next = new Set(completed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }
  const visible = ITEMS.filter(
    (item) =>
      (filter === "All" || item.category === filter) &&
      (show === "all" ||
        (show === "complete"
          ? completed.has(item.id)
          : !completed.has(item.id))),
  )
  const markdown = useMemo(
    () =>
      [
        `# SEO audit checklist`,
        "",
        `Progress: ${completed.size}/${ITEMS.length}`,
        "",
        ...CATEGORIES.flatMap((category) => [
          `## ${category}`,
          "",
          ...ITEMS.filter((item) => item.category === category).map(
            (item) => `- [${completed.has(item.id) ? "x" : " "}] ${item.label}`,
          ),
          "",
        ]),
      ].join("\n"),
    [completed],
  )
  const percentage = Math.round((completed.size / ITEMS.length) * 100)

  return (
    <div className="space-y-6">
      <ToolPanel
        id="checklist-progress"
        title="Audit progress"
        description="Progress is stored only in this browser."
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update(new Set())}
              disabled={!completed.size}
            >
              <RotateCcw aria-hidden />
              Reset
            </Button>
            <DownloadTextButton
              content={markdown}
              filename="seo-audit-checklist.md"
              label="Export"
            />
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <ToolMetric
            label="Complete"
            value={`${completed.size}/${ITEMS.length}`}
          />
          <ToolMetric label="Progress" value={`${percentage}%`} />
          <ToolMetric label="Remaining" value={ITEMS.length - completed.size} />
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={ITEMS.length}
          aria-valuenow={completed.size}
        >
          <div
            className="h-full rounded-full bg-[#0051d5] transition-[width]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </ToolPanel>
      <ToolPanel
        id="checklist-items"
        title="50-point review"
        action={
          <ToolStatusBadge
            tone={completed.size === ITEMS.length ? "good" : "neutral"}
          >
            {completed.size === ITEMS.length
              ? "Audit complete"
              : `${visible.length} shown`}
          </ToolStatusBadge>
        }
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["All", ...CATEGORIES] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                aria-pressed={filter === category}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === category ? "border-[#0051d5] bg-blue-50 text-[#0051d5]" : "border-slate-200 text-slate-600"}`}
              >
                {category}
              </button>
            ))}
          </div>
          <select
            aria-label="Completion filter"
            value={show}
            onChange={(event) => setShow(event.target.value as typeof show)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="all">All items</option>
            <option value="remaining">Remaining</option>
            <option value="complete">Complete</option>
          </select>
        </div>
        <div className="space-y-6">
          {CATEGORIES.map((category) => {
            const items = visible.filter((item) => item.category === category)
            if (!items.length) return null
            const categoryDone = ITEMS.filter(
              (item) => item.category === category && completed.has(item.id),
            ).length
            return (
              <section key={category} aria-labelledby={`checklist-${category}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3
                    id={`checklist-${category}`}
                    className="font-semibold text-slate-950"
                  >
                    {category}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {categoryDone}/{CHECKS[category].length}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 bg-white p-4 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={completed.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 size-4 shrink-0 accent-[#0051d5]"
                      />
                      <span
                        className={`text-sm leading-6 ${completed.has(item.id) ? "text-slate-500 line-through" : "text-slate-800"}`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </ToolPanel>
    </div>
  )
}
