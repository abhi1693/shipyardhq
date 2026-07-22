"use client"

import { useState } from "react"
import {
  AlertCircle,
  Gauge,
  LoaderCircle,
  Monitor,
  Smartphone,
} from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"

import {
  ToolEmptyState,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
} from "./ToolWorkspaceUi"

type Vital = { value: number; category: string } | null
type PageSpeedResult = {
  error?: string
  url: string
  strategy: "mobile" | "desktop"
  fetchedAt: string
  field: { overall: string | null; lcp: Vital; inp: Vital; cls: Vital }
  lab: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    lcpMs: number | null
    cls: number | null
    tbtMs: number | null
    fcpMs: number | null
    speedIndexMs: number | null
  }
  opportunities: Array<{
    id: string
    title: string
    displayValue: string
    savingsMs: number
  }>
}

function scoreTone(score: number): "good" | "warning" | "danger" {
  return score >= 90 ? "good" : score >= 50 ? "warning" : "danger"
}
function categoryTone(
  category?: string | null,
): "good" | "warning" | "danger" | "neutral" {
  return category === "fast" || category === "good"
    ? "good"
    : category === "average" || category === "needs_improvement"
      ? "warning"
      : category
        ? "danger"
        : "neutral"
}
function milliseconds(value: number | null) {
  return value === null
    ? "N/A"
    : value >= 1000
      ? `${(value / 1000).toFixed(2)} s`
      : `${Math.round(value)} ms`
}

function FieldVital({
  label,
  vital,
  format = "ms",
}: {
  label: string
  vital: Vital
  format?: "ms" | "decimal"
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <ToolStatusBadge tone={categoryTone(vital?.category)}>
          {vital?.category?.replaceAll("_", " ") ?? "No field data"}
        </ToolStatusBadge>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">
        {vital
          ? format === "ms"
            ? milliseconds(vital.value)
            : vital.value.toFixed(3)
          : "—"}
      </p>
    </div>
  )
}

export function CoreWebVitalsTool() {
  const [url, setUrl] = useState("https://shipyardhq.com/")
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile")
  const [result, setResult] = useState<PageSpeedResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  async function run() {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const response = await fetch("/api/tools/page-speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy }),
      })
      const data = (await response.json()) as PageSpeedResult
      if (!response.ok)
        throw new Error(data.error || "The performance test failed.")
      setResult(data)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The performance test failed.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6">
      <ToolPanel
        id="vitals-input"
        title="Run a PageSpeed test"
        description="Tests use Google's PageSpeed Insights service and can take up to a minute."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void run()
          }}
          className="space-y-4"
        >
          <Input
            aria-label="Page URL"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-11 border-slate-300 bg-white"
            required
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { value: "mobile", label: "Mobile", icon: Smartphone },
                  { value: "desktop", label: "Desktop", icon: Monitor },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStrategy(item.value)}
                  aria-pressed={strategy === item.value}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
                    strategy === item.value
                      ? "bg-white text-[#0051d5] shadow-sm"
                      : "text-slate-600",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0051d5] text-white hover:bg-[#003f9f]"
            >
              {loading ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Gauge aria-hidden />
              )}
              {loading ? "Testing…" : "Check vitals"}
            </Button>
          </div>
        </form>
      </ToolPanel>
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}
      {result ? (
        <>
          <ToolPanel
            id="vitals-field"
            title="Real-user field data"
            description="75th-percentile Chrome user experience data for this URL when enough traffic exists."
            action={
              <ToolStatusBadge tone={categoryTone(result.field.overall)}>
                {result.field.overall?.replaceAll("_", " ") ??
                  "Insufficient field data"}
              </ToolStatusBadge>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldVital label="LCP" vital={result.field.lcp} />
              <FieldVital label="INP" vital={result.field.inp} />
              <FieldVital
                label="CLS"
                vital={result.field.cls}
                format="decimal"
              />
            </div>
          </ToolPanel>
          <ToolPanel
            id="vitals-lab"
            title={`Lighthouse lab report · ${result.strategy}`}
            description="A controlled diagnostic run. It is not a substitute for real-user monitoring."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ToolMetric
                label="Performance"
                value={
                  <ToolStatusBadge tone={scoreTone(result.lab.performance)}>
                    {result.lab.performance}
                  </ToolStatusBadge>
                }
              />
              <ToolMetric
                label="Accessibility"
                value={
                  <ToolStatusBadge tone={scoreTone(result.lab.accessibility)}>
                    {result.lab.accessibility}
                  </ToolStatusBadge>
                }
              />
              <ToolMetric
                label="Best practices"
                value={
                  <ToolStatusBadge tone={scoreTone(result.lab.bestPractices)}>
                    {result.lab.bestPractices}
                  </ToolStatusBadge>
                }
              />
              <ToolMetric
                label="SEO"
                value={
                  <ToolStatusBadge tone={scoreTone(result.lab.seo)}>
                    {result.lab.seo}
                  </ToolStatusBadge>
                }
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ToolMetric label="LCP" value={milliseconds(result.lab.lcpMs)} />
              <ToolMetric label="FCP" value={milliseconds(result.lab.fcpMs)} />
              <ToolMetric label="TBT" value={milliseconds(result.lab.tbtMs)} />
              <ToolMetric
                label="CLS"
                value={result.lab.cls?.toFixed(3) ?? "N/A"}
              />
              <ToolMetric
                label="Speed index"
                value={milliseconds(result.lab.speedIndexMs)}
              />
            </div>
          </ToolPanel>
          <ToolPanel
            id="vitals-opportunities"
            title="Largest estimated opportunities"
            description="Savings are Lighthouse estimates and may overlap."
          >
            {result.opportunities.length ? (
              <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                {result.opportunities.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.title}
                      </p>
                      {item.displayValue ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.displayValue}
                        </p>
                      ) : null}
                    </div>
                    <ToolStatusBadge tone="warning">
                      up to {milliseconds(item.savingsMs)}
                    </ToolStatusBadge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-600">
                No material time-saving opportunities were returned for this
                run.
              </p>
            )}
          </ToolPanel>
        </>
      ) : !error ? (
        <ToolEmptyState
          title="No test yet"
          description="Choose a device strategy and run the test to separate real-user vitals from Lighthouse lab diagnostics."
        />
      ) : null}
    </div>
  )
}
