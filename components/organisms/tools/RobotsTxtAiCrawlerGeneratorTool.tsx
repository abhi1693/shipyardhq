"use client"

import { useMemo, useState } from "react"
import { Bot, Globe2 } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  CopyableCode,
  DownloadTextButton,
  ToolField,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "@/components/organisms/tools/ToolWorkspaceUi"
import { generateRobotsTxt } from "@/lib/tools/generators"
import { cn } from "@/lib/utils"

const crawlers = [
  {
    userAgent: "GPTBot",
    label: "GPTBot",
    description: "OpenAI's automated web crawler",
  },
  {
    userAgent: "ChatGPT-User",
    label: "ChatGPT-User",
    description: "Pages fetched in response to a user request",
  },
  {
    userAgent: "ClaudeBot",
    label: "ClaudeBot",
    description: "Anthropic's automated web crawler",
  },
  {
    userAgent: "PerplexityBot",
    label: "PerplexityBot",
    description: "Perplexity's search crawler",
  },
  {
    userAgent: "Google-Extended",
    label: "Google-Extended",
    description: "Google token for some generative AI uses",
  },
  {
    userAgent: "CCBot",
    label: "CCBot",
    description: "Common Crawl's web crawler",
  },
] as const

type CrawlerState = Record<(typeof crawlers)[number]["userAgent"], boolean>

const initialCrawlerState = Object.fromEntries(
  crawlers.map(({ userAgent }) => [userAgent, true]),
) as CrawlerState

export function RobotsTxtAiCrawlerGeneratorTool() {
  const [allowAll, setAllowAll] = useState(true)
  const [crawlerState, setCrawlerState] =
    useState<CrawlerState>(initialCrawlerState)
  const [sitemapUrl, setSitemapUrl] = useState(
    "https://example.com/sitemap.xml",
  )
  const [privatePaths, setPrivatePaths] = useState(
    ["/member", "/api", "/r/"].join("\n"),
  )
  const disallowPaths = useMemo(
    () =>
      Array.from(
        new Set(
          privatePaths
            .split(/[\n,]/)
            .map((path) => path.trim())
            .filter(Boolean),
        ),
      ),
    [privatePaths],
  )

  const output = useMemo(
    () =>
      generateRobotsTxt({
        allowAll,
        crawlerRules: crawlers.map(({ userAgent }) => ({
          userAgent,
          allowed: crawlerState[userAgent],
        })),
        sitemapUrl,
        disallowPaths,
      }),
    [allowAll, crawlerState, disallowPaths, sitemapUrl],
  )
  const allowedCount = Object.values(crawlerState).filter(Boolean).length

  function toggleCrawler(userAgent: keyof CrawlerState) {
    setCrawlerState((current) => ({
      ...current,
      [userAgent]: !current[userAgent],
    }))
  }

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="robots-controls"
        title="Crawler access rules"
        description="Choose a site-wide default, then set explicit rules for common AI crawlers."
      >
        <div className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-900">
              Default rule for search crawlers
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: "Allow crawling", icon: Globe2 },
                { value: false, label: "Block crawling", icon: Bot },
              ].map((option) => {
                const Icon = option.icon
                const selected = allowAll === option.value
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setAllowAll(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                      selected
                        ? "border-[#0051d5] bg-blue-50 text-[#003f9f]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-900">
              AI crawler rules
            </legend>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {crawlers.map(({ userAgent, label, description }) => {
                const allowed = crawlerState[userAgent]
                return (
                  <label
                    key={userAgent}
                    htmlFor={`crawler-${userAgent}`}
                    className="flex cursor-pointer items-center justify-between gap-4 p-4"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-950">
                        {label}
                      </span>
                      <span className="block text-xs leading-5 text-slate-500">
                        {description}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          allowed ? "text-emerald-700" : "text-red-700",
                        )}
                      >
                        {allowed ? "Allow" : "Block"}
                      </span>
                      <input
                        id={`crawler-${userAgent}`}
                        type="checkbox"
                        role="switch"
                        checked={allowed}
                        onChange={() => toggleCrawler(userAgent)}
                        className="size-4 accent-[#0051d5]"
                      />
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <ToolField
            htmlFor="robots-private-paths"
            label="Paths crawlers should not fetch"
            hint="One path per line"
          >
            <Textarea
              id="robots-private-paths"
              value={privatePaths}
              onChange={(event) => setPrivatePaths(event.target.value)}
              className="min-h-28 border-slate-300 bg-white font-mono text-xs leading-5"
              placeholder={"/member\n/api\n/r/"}
              spellCheck={false}
            />
          </ToolField>

          <ToolField
            htmlFor="robots-sitemap"
            label="Sitemap URL"
            hint="Recommended"
          >
            <Input
              id="robots-sitemap"
              type="url"
              value={sitemapUrl}
              onChange={(event) => setSitemapUrl(event.target.value)}
              className="h-10 border-slate-300 bg-white"
              placeholder="https://example.com/sitemap.xml"
            />
          </ToolField>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="robots-output"
          title="Generated robots.txt"
          description="Upload this file at the root of your domain as /robots.txt."
          action={
            <DownloadTextButton
              content={output}
              filename="robots.txt"
              label="Download"
            />
          }
        >
          <CopyableCode code={output} label="robots.txt" />
        </ToolPanel>

        <ToolPanel
          id="robots-summary"
          title="Access summary"
          description="These directives express a crawl preference; individual services may change their tokens or behavior."
          action={
            <ToolStatusBadge tone={allowAll ? "good" : "warning"}>
              {allowAll ? "Search allowed" : "Search blocked"}
            </ToolStatusBadge>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Default crawler rule
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {allowAll ? "Allow all pages" : "Block all pages"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Explicit AI rules
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {allowedCount} allowed · {crawlers.length - allowedCount}{" "}
                blocked
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Disallowed paths
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {disallowPaths.length} listed
              </p>
            </div>
          </div>
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
