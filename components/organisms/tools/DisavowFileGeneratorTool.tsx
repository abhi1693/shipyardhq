"use client"

import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

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
} from "./ToolWorkspaceUi"

function parseEntries(raw: string) {
  const valid: string[] = []
  const invalid: string[] = []
  for (const line of raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    if (line.startsWith("#")) {
      valid.push(line)
      continue
    }
    if (line.toLowerCase().startsWith("domain:")) {
      const domain = line
        .slice(7)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
      if (/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(domain))
        valid.push(`domain:${domain}`)
      else invalid.push(line)
      continue
    }
    try {
      const url = new URL(line)
      if (["http:", "https:"].includes(url.protocol)) valid.push(url.toString())
      else invalid.push(line)
    } catch {
      invalid.push(line)
    }
  }
  return { valid: [...new Set(valid)], invalid }
}

export function DisavowFileGeneratorTool() {
  const [entries, setEntries] = useState(
    "domain:spam-example.com\nhttps://bad-links.example/page.html",
  )
  const [site, setSite] = useState("example.com")
  const parsed = useMemo(() => parseEntries(entries), [entries])
  const domains = parsed.valid.filter((item) =>
    item.startsWith("domain:"),
  ).length
  const urls = parsed.valid.filter((item) => /^https?:/.test(item)).length
  const output =
    [
      `# Disavow file for ${site.trim() || "your site"}`,
      "# Generated with Shipyard — review every entry before submission",
      ...parsed.valid,
    ].join("\n") + "\n"

  return (
    <div className="space-y-6">
      <div
        className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-950"
        role="alert"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Advanced, high-risk action</p>
          <p className="mt-1 text-sm leading-6">
            Most sites should not use a disavow file. Incorrectly disavowing
            legitimate links can damage search performance. Investigate and
            request removals first, and get an experienced review before
            submitting anything.
          </p>
        </div>
      </div>
      <ToolWorkspaceGrid>
        <ToolPanel
          id="disavow-input"
          title="Links to review"
          description="Use domain:example.com for an entire domain, or enter one absolute URL per line."
        >
          <div className="space-y-5">
            <ToolField
              htmlFor="disavow-site"
              label="Your site"
              hint="Used only in the comment header"
            >
              <Input
                id="disavow-site"
                value={site}
                onChange={(event) => setSite(event.target.value)}
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
            <ToolField
              htmlFor="disavow-entries"
              label="Domain or URL entries"
              error={
                parsed.invalid.length
                  ? `${parsed.invalid.length} invalid entr${parsed.invalid.length === 1 ? "y" : "ies"} will be skipped.`
                  : undefined
              }
            >
              <Textarea
                id="disavow-entries"
                value={entries}
                onChange={(event) => setEntries(event.target.value)}
                className="min-h-72 resize-y border-slate-300 bg-white font-mono text-xs leading-6"
                spellCheck={false}
              />
            </ToolField>
          </div>
        </ToolPanel>
        <div className="space-y-6">
          <ToolPanel
            id="disavow-summary"
            title="File summary"
            action={
              <ToolStatusBadge
                tone={parsed.invalid.length ? "warning" : "danger"}
              >
                {parsed.invalid.length
                  ? "Review invalid entries"
                  : "Manual review required"}
              </ToolStatusBadge>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              <ToolMetric label="Domains" value={domains} />
              <ToolMetric label="URLs" value={urls} />
              <ToolMetric label="Invalid" value={parsed.invalid.length} />
            </div>
          </ToolPanel>
          <ToolPanel
            id="disavow-output"
            title="Generated disavow.txt"
            action={
              <DownloadTextButton
                content={output}
                filename="disavow.txt"
                disabled={!parsed.valid.length}
              />
            }
          >
            <CopyableCode code={output} label="disavow.txt" />
          </ToolPanel>
        </div>
      </ToolWorkspaceGrid>
    </div>
  )
}
