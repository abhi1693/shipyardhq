"use client"

import { useMemo, useState } from "react"

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

type Platform = "apache" | "nginx" | "next" | "vercel"

function parsePairs(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [source, ...destinationParts] = line.split(/\s*(?:,|=>|\t)\s*/)
      return {
        source: source?.trim() ?? "",
        destination: destinationParts.join(",").trim(),
      }
    })
}

function pathFrom(value: string) {
  try {
    return new URL(value).pathname + new URL(value).search
  } catch {
    return value.startsWith("/") ? value : `/${value}`
  }
}

export function RedirectGeneratorTool() {
  const [pairs, setPairs] = useState(
    "/old-page, /new-page\nhttps://example.com/legacy, https://example.com/guides",
  )
  const [permanent, setPermanent] = useState(true)
  const [platform, setPlatform] = useState<Platform>("next")
  const rows = useMemo(() => parsePairs(pairs), [pairs])
  const valid = rows.filter(
    (row) => row.source && row.destination && row.source !== row.destination,
  )
  const duplicates = valid.length - new Set(valid.map((row) => row.source)).size
  const status = permanent ? 301 : 302
  const output = useMemo(() => {
    if (platform === "apache")
      return valid
        .map(
          (row) =>
            `Redirect ${status} ${pathFrom(row.source)} ${row.destination}`,
        )
        .join("\n")
    if (platform === "nginx")
      return valid
        .map(
          (row) =>
            `location = ${pathFrom(row.source)} { return ${status} ${row.destination}; }`,
        )
        .join("\n")
    if (platform === "vercel")
      return JSON.stringify(
        {
          redirects: valid.map((row) => ({
            source: pathFrom(row.source),
            destination: row.destination,
            permanent,
          })),
        },
        null,
        2,
      )
    return `async redirects() {\n  return ${JSON.stringify(
      valid.map((row) => ({
        source: pathFrom(row.source),
        destination: row.destination,
        permanent,
      })),
      null,
      2,
    )
      .replace(/^/gm, "  ")
      .trimStart()}\n}`
  }, [permanent, platform, status, valid])

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="redirect-input"
        title="Redirect map"
        description="Enter one source and destination per line, separated by a comma, tab, or =>."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="redirect-pairs"
            label="Source and destination pairs"
            hint={`${valid.length} valid`}
          >
            <Textarea
              id="redirect-pairs"
              value={pairs}
              onChange={(event) => setPairs(event.target.value)}
              className="min-h-72 resize-y border-slate-300 bg-white font-mono text-xs leading-6"
              spellCheck={false}
            />
          </ToolField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolField htmlFor="redirect-platform" label="Platform">
              <select
                id="redirect-platform"
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value as Platform)
                }
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="next">Next.js</option>
                <option value="vercel">Vercel</option>
                <option value="apache">Apache</option>
                <option value="nginx">Nginx</option>
              </select>
            </ToolField>
            <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium">
              <span>{permanent ? "301 permanent" : "302 temporary"}</span>
              <input
                type="checkbox"
                checked={permanent}
                onChange={(event) => setPermanent(event.target.checked)}
                className="size-4 accent-[#0051d5]"
              />
            </label>
          </div>
        </div>
      </ToolPanel>
      <div className="space-y-6">
        <ToolPanel
          id="redirect-summary"
          title="Validation summary"
          action={
            <ToolStatusBadge
              tone={
                duplicates || rows.length !== valid.length ? "warning" : "good"
              }
            >
              {duplicates || rows.length !== valid.length
                ? "Review map"
                : "Ready"}
            </ToolStatusBadge>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="Valid rules" value={valid.length} />
            <ToolMetric label="Skipped" value={rows.length - valid.length} />
            <ToolMetric label="Duplicate sources" value={duplicates} />
          </div>
        </ToolPanel>
        <ToolPanel
          id="redirect-output"
          title={`${platform === "next" ? "Next.js" : platform[0].toUpperCase() + platform.slice(1)} configuration`}
          action={
            <DownloadTextButton
              content={output}
              filename={
                platform === "apache"
                  ? ".htaccess"
                  : platform === "nginx"
                    ? "redirects.conf"
                    : "redirects.txt"
              }
              disabled={!valid.length}
            />
          }
        >
          <CopyableCode
            code={output || "Add a valid redirect pair."}
            label="Redirect rules"
          />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
