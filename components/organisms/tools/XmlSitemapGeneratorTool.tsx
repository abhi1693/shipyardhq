"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  CopyableCode,
  DownloadTextButton,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "@/components/organisms/tools/ToolWorkspaceUi"
import {
  generateXmlSitemap,
  parseSitemapUrls,
  type SitemapOptions,
} from "@/lib/tools/generators"

const defaultUrls = [
  "https://example.com/",
  "https://example.com/product",
  "https://example.com/pricing",
  "https://example.com/blog",
].join("\n")

export function XmlSitemapGeneratorTool() {
  const [rawUrls, setRawUrls] = useState(defaultUrls)
  const [changeFrequency, setChangeFrequency] = useState<
    SitemapOptions["changeFrequency"] | ""
  >("weekly")
  const [priority, setPriority] = useState("0.8")
  const [includeLastModified, setIncludeLastModified] = useState(false)
  const [lastModified, setLastModified] = useState("")

  const parsed = useMemo(() => parseSitemapUrls(rawUrls), [rawUrls])
  const urls = parsed.valid.slice(0, 50000)
  const xml = useMemo(
    () =>
      generateXmlSitemap(urls, {
        changeFrequency: changeFrequency || undefined,
        priority: priority === "" ? undefined : Number(priority),
        lastModified:
          includeLastModified && lastModified ? lastModified : undefined,
      }),
    [changeFrequency, includeLastModified, lastModified, priority, urls],
  )
  const tooMany = parsed.valid.length > 50000
  const hasIssues = parsed.invalid.length > 0 || tooMany

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="sitemap-inputs"
        title="URLs to include"
        description="Enter one absolute URL per line, using the same protocol and host."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="sitemap-urls"
            label="Page URLs"
            hint={`${parsed.valid.length} valid`}
            error={
              parsed.invalid.length
                ? `${parsed.invalid.length} invalid value${parsed.invalid.length === 1 ? "" : "s"} will be skipped.`
                : undefined
            }
            required
          >
            <Textarea
              id="sitemap-urls"
              value={rawUrls}
              onChange={(event) => setRawUrls(event.target.value)}
              className="min-h-64 resize-y border-slate-300 bg-white font-mono text-xs leading-5"
              spellCheck={false}
              aria-describedby={
                parsed.invalid.length ? "sitemap-urls-error" : undefined
              }
            />
          </ToolField>

          {parsed.invalid.length ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
              <p className="font-semibold">Skipped values</p>
              <ul className="mt-1 list-inside list-disc">
                {parsed.invalid.slice(0, 3).map((value) => (
                  <li key={value} className="truncate">
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField htmlFor="sitemap-frequency" label="Change frequency">
              <select
                id="sitemap-frequency"
                value={changeFrequency}
                onChange={(event) =>
                  setChangeFrequency(
                    event.target.value as
                      SitemapOptions["changeFrequency"] | "",
                  )
                }
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0051d5]"
              >
                <option value="">Do not include</option>
                {[
                  "always",
                  "hourly",
                  "daily",
                  "weekly",
                  "monthly",
                  "yearly",
                  "never",
                ].map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency[0].toUpperCase() + frequency.slice(1)}
                  </option>
                ))}
              </select>
            </ToolField>
            <ToolField
              htmlFor="sitemap-priority"
              label="Priority"
              hint="0.0 to 1.0"
            >
              <Input
                id="sitemap-priority"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label
              htmlFor="sitemap-lastmod-toggle"
              className="flex cursor-pointer items-center justify-between gap-4"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-950">
                  Include last modified date
                </span>
                <span className="block text-xs leading-5 text-slate-500">
                  Only use a date you can keep accurate.
                </span>
              </span>
              <input
                id="sitemap-lastmod-toggle"
                type="checkbox"
                role="switch"
                checked={includeLastModified}
                onChange={(event) =>
                  setIncludeLastModified(event.target.checked)
                }
                className="size-4 accent-[#0051d5]"
              />
            </label>
            {includeLastModified ? (
              <Input
                id="sitemap-lastmod"
                type="date"
                value={lastModified}
                onChange={(event) => setLastModified(event.target.value)}
                aria-label="Last modified date"
                className="mt-3 h-10 border-slate-300 bg-white"
              />
            ) : null}
          </div>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="sitemap-summary"
          title="Sitemap summary"
          description="The generator removes duplicate URLs and skips unsupported protocols."
          action={
            <ToolStatusBadge tone={hasIssues ? "warning" : "good"}>
              {hasIssues ? "Review warnings" : "Ready to export"}
            </ToolStatusBadge>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <ToolMetric
              label="Included URLs"
              value={urls.length.toLocaleString()}
              detail="Unique HTTP or HTTPS pages"
            />
            <ToolMetric
              label="Skipped"
              value={parsed.invalid.length.toLocaleString()}
              detail="Invalid or unsupported values"
            />
            <ToolMetric
              label="Protocol limit"
              value="50,000"
              detail={tooMany ? "Extra URLs were omitted" : "URLs per sitemap"}
            />
          </div>
        </ToolPanel>

        <ToolPanel
          id="sitemap-output"
          title="Generated sitemap.xml"
          description="Upload this file, then reference it in robots.txt and submit it in search consoles."
          action={
            <DownloadTextButton
              content={xml}
              filename="sitemap.xml"
              label="Download XML"
              mimeType="application/xml;charset=utf-8"
              disabled={!urls.length}
            />
          }
        >
          <CopyableCode code={xml} label="XML sitemap" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
