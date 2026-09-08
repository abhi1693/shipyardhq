"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  ScanSearch,
} from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  auditToMarkdown,
  type AuditFinding,
  type SeoAuditResult,
} from "@/lib/tools/seo-audit"
import { cn } from "@/lib/utils"

import {
  DownloadTextButton,
  ToolEmptyState,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
} from "./ToolWorkspaceUi"

type ScanResponse = {
  results?: Array<{ url: string; audit?: SeoAuditResult; error?: string }>
  error?: string
}

function scoreTone(score: number): "good" | "warning" | "danger" {
  return score >= 85 ? "good" : score >= 65 ? "warning" : "danger"
}

function FindingRow({ finding }: { finding: AuditFinding }) {
  const tone =
    finding.tone === "pass"
      ? "border-emerald-200 bg-emerald-50/60"
      : finding.tone === "warning"
        ? "border-amber-200 bg-amber-50/60"
        : "border-red-200 bg-red-50/60"
  return (
    <details className={cn("group rounded-xl border", tone)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-950 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            finding.tone === "pass"
              ? "bg-emerald-500"
              : finding.tone === "warning"
                ? "bg-amber-500"
                : "bg-red-500",
          )}
        />
        <span className="flex-1">{finding.label}</span>
        <span className="text-xs uppercase text-slate-500">{finding.tone}</span>
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-current/10 px-4 py-3 text-sm leading-6 text-slate-700">
        <p>{finding.evidence}</p>
        {finding.tone !== "pass" && finding.recommendation ? (
          <p className="mt-2">
            <strong>Recommended:</strong> {finding.recommendation}
          </p>
        ) : null}
      </div>
    </details>
  )
}

function AuditReport({
  audit,
  compact = false,
}: {
  audit: SeoAuditResult
  compact?: boolean
}) {
  const errors = audit.findings.filter((item) => item.tone === "error")
  const warnings = audit.findings.filter((item) => item.tone === "warning")
  const passes = audit.findings.filter((item) => item.tone === "pass")
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {audit.title || audit.finalUrl}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {audit.finalUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToolStatusBadge tone={scoreTone(audit.score)}>
            {audit.score}/100
          </ToolStatusBadge>
          <DownloadTextButton
            content={auditToMarkdown(audit)}
            filename="seo-audit.md"
            label="Export"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ToolMetric label="Critical" value={errors.length} />
        <ToolMetric label="Warnings" value={warnings.length} />
        <ToolMetric label="Passed" value={passes.length} />
        <ToolMetric label="Response" value={`${audit.responseTimeMs} ms`} />
      </div>
      {!compact ? (
        <div className="space-y-3">
          {[...errors, ...warnings, ...passes].map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function useAuditScan() {
  const [results, setResults] = useState<NonNullable<ScanResponse["results"]>>(
    [],
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  async function scan(urls: string[], includeSiteFiles = false) {
    setLoading(true)
    setError("")
    setResults([])
    try {
      const response = await fetch("/api/tools/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, includeSiteFiles }),
      })
      const data = (await response.json()) as ScanResponse
      if (!response.ok) throw new Error(data.error || "The scan failed.")
      setResults(data.results ?? [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan failed.")
    } finally {
      setLoading(false)
    }
  }
  return { results, error, loading, scan }
}

function ScanError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  )
}

export function SeoAuditTool() {
  const [url, setUrl] = useState("https://shipyardhq.dev/")
  const { results, error, loading, scan } = useAuditScan()
  const result = results[0]
  return (
    <div className="space-y-6">
      <ToolPanel
        id="audit-input"
        title="Scan a public page"
        description="The audit reads the initial HTML response and public site files; it never changes the target site."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void scan([url], true)
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            aria-label="Page URL"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/page"
            className="h-11 flex-1 border-slate-300 bg-white"
            required
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 bg-[#0051d5] text-white hover:bg-[#003f9f]"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ScanSearch aria-hidden />
            )}
            {loading ? "Scanning…" : "Run audit"}
          </Button>
        </form>
      </ToolPanel>
      {error ? (
        <ScanError message={error} />
      ) : result?.error ? (
        <ScanError message={result.error} />
      ) : result?.audit ? (
        <AuditReport audit={result.audit} />
      ) : (
        <ToolEmptyState
          title="Ready to scan"
          description="Enter a public page URL to get a transparent, prioritized report with exportable evidence."
        />
      )}
    </div>
  )
}

function parseUrls(value: string, max: number) {
  return [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, max)
}

export function BulkSeoAuditTool() {
  const [raw, setRaw] = useState(
    "https://shipyardhq.dev/\nhttps://shipyardhq.dev/tools",
  )
  const urls = parseUrls(raw, 10)
  const { results, error, loading, scan } = useAuditScan()
  return (
    <div className="space-y-6">
      <ToolPanel
        id="bulk-audit-input"
        title="Pages to audit"
        description="Enter up to ten public URLs, one per line."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void scan(urls)
          }}
          className="space-y-4"
        >
          <ToolField
            htmlFor="bulk-audit-urls"
            label="Page URLs"
            hint={`${urls.length}/10 unique`}
          >
            <Textarea
              id="bulk-audit-urls"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              className="min-h-48 border-slate-300 bg-white font-mono text-xs leading-6"
            />
          </ToolField>
          <Button
            type="submit"
            disabled={loading || !urls.length}
            className="bg-[#0051d5] text-white hover:bg-[#003f9f]"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ScanSearch aria-hidden />
            )}
            {loading
              ? "Scanning pages…"
              : `Audit ${urls.length} page${urls.length === 1 ? "" : "s"}`}
          </Button>
        </form>
      </ToolPanel>
      {error ? <ScanError message={error} /> : null}
      {results.length ? (
        <div className="space-y-5">
          {results.map((result) => (
            <ToolPanel
              key={result.url}
              id={`bulk-${result.url}`}
              title={result.audit?.title || result.url}
            >
              {result.audit ? (
                <AuditReport audit={result.audit} />
              ) : (
                <ScanError
                  message={result.error || "The page could not be scanned."}
                />
              )}
            </ToolPanel>
          ))}
        </div>
      ) : !error ? (
        <ToolEmptyState
          title="No pages scanned yet"
          description="Run the bulk audit to compare page health and open the detailed findings for each URL."
        />
      ) : null}
    </div>
  )
}

export function SeoComparisonTool() {
  const [raw, setRaw] = useState(
    "https://shipyardhq.dev/\nhttps://shipyardhq.dev/tools",
  )
  const urls = parseUrls(raw, 5)
  const { results, error, loading, scan } = useAuditScan()
  const audits = results.flatMap((result) =>
    result.audit ? [result.audit] : [],
  )
  const rows = useMemo(
    () =>
      audits.map((audit) => ({
        audit,
        critical: audit.findings.filter((item) => item.tone === "error").length,
        warnings: audit.findings.filter((item) => item.tone === "warning")
          .length,
      })),
    [audits],
  )
  return (
    <div className="space-y-6">
      <ToolPanel
        id="compare-input"
        title="Pages to compare"
        description="Use pages that answer the same search intent for a meaningful comparison."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void scan(urls)
          }}
          className="space-y-4"
        >
          <ToolField
            htmlFor="compare-urls"
            label="Page URLs"
            hint={`${urls.length}/5 unique`}
          >
            <Textarea
              id="compare-urls"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              className="min-h-40 border-slate-300 bg-white font-mono text-xs leading-6"
            />
          </ToolField>
          <Button
            type="submit"
            disabled={loading || urls.length < 2}
            className="bg-[#0051d5] text-white hover:bg-[#003f9f]"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ScanSearch aria-hidden />
            )}
            {loading ? "Comparing…" : "Compare pages"}
          </Button>
        </form>
      </ToolPanel>
      {error ? <ScanError message={error} /> : null}
      {rows.length ? (
        <ToolPanel
          id="comparison-table"
          title="Side-by-side evidence"
          description="Counts provide context; more is not automatically better."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Page",
                    "Score",
                    "Critical",
                    "Warnings",
                    "Words",
                    "Headings",
                    "Links",
                    "Images",
                    "Response",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map(({ audit, critical, warnings }) => (
                  <tr key={audit.finalUrl}>
                    <td className="max-w-64 px-3 py-3">
                      <p className="truncate font-semibold text-slate-950">
                        {audit.title || new URL(audit.finalUrl).hostname}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {audit.finalUrl}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <ToolStatusBadge tone={scoreTone(audit.score)}>
                        {audit.score}
                      </ToolStatusBadge>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{critical}</td>
                    <td className="px-3 py-3 tabular-nums">{warnings}</td>
                    <td className="px-3 py-3 tabular-nums">{audit.words}</td>
                    <td className="px-3 py-3 tabular-nums">{audit.headings}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {audit.links.total}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {audit.images.total}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {audit.responseTimeMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ToolPanel>
      ) : !error ? (
        <ToolEmptyState
          title="Add at least two comparable pages"
          description="The report aligns the same page-level evidence in one table so differences are easy to investigate."
        />
      ) : null}
      {results
        .filter((result) => result.error)
        .map((result) => (
          <ScanError
            key={result.url}
            message={`${result.url}: ${result.error}`}
          />
        ))}
    </div>
  )
}
