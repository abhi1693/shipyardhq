"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { escapeHtmlAttribute, escapeXml } from "@/lib/tools/generators"

import {
  CopyableCode,
  ToolField,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

type Alternate = {
  id: number
  language: string
  region: string
  url: string
  isDefault: boolean
}

const INITIAL: Alternate[] = [
  {
    id: 1,
    language: "en",
    region: "US",
    url: "https://example.com/us/",
    isDefault: false,
  },
  {
    id: 2,
    language: "en",
    region: "GB",
    url: "https://example.com/uk/",
    isDefault: false,
  },
  {
    id: 3,
    language: "",
    region: "",
    url: "https://example.com/",
    isDefault: true,
  },
]

export function HreflangGeneratorTool() {
  const [entries, setEntries] = useState(INITIAL)
  const [format, setFormat] = useState<"html" | "header" | "xml">("html")
  const update = (id: number, patch: Partial<Alternate>) =>
    setEntries((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  const validEntries = useMemo(
    () =>
      entries.flatMap((entry) => {
        try {
          const url = new URL(entry.url.trim())
          if (!["http:", "https:"].includes(url.protocol)) return []
          const language = entry.isDefault
            ? "x-default"
            : entry.language.trim().toLowerCase()
          if (!entry.isDefault && !/^[a-z]{2,3}$/.test(language)) return []
          const region = entry.region.trim().toUpperCase()
          if (region && !/^[A-Z]{2}$/.test(region)) return []
          return [
            {
              code: entry.isDefault
                ? language
                : [language, region].filter(Boolean).join("-"),
              url: url.toString(),
            },
          ]
        } catch {
          return []
        }
      }),
    [entries],
  )
  const output = useMemo(() => {
    if (format === "header")
      return validEntries
        .map(
          (entry) =>
            `<${entry.url}>; rel=\"alternate\"; hreflang=\"${entry.code}\"`,
        )
        .join(",\n")
    if (format === "xml")
      return [
        `<url>`,
        `  <loc>${escapeXml(validEntries[0]?.url ?? "https://example.com/")}</loc>`,
        ...validEntries.map(
          (entry) =>
            `  <xhtml:link rel=\"alternate\" hreflang=\"${entry.code}\" href=\"${escapeXml(entry.url)}\" />`,
        ),
        `</url>`,
      ].join("\n")
    return validEntries
      .map(
        (entry) =>
          `<link rel=\"alternate\" hreflang=\"${entry.code}\" href=\"${escapeHtmlAttribute(entry.url)}\" />`,
      )
      .join("\n")
  }, [format, validEntries])

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="hreflang-input"
        title="Language alternates"
        description="Every URL should publish the same complete set, including itself."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setEntries((items) => [
                ...items,
                {
                  id: Date.now(),
                  language: "",
                  region: "",
                  url: "",
                  isDefault: false,
                },
              ])
            }
          >
            <Plus aria-hidden />
            Add
          </Button>
        }
      >
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Alternate {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setEntries((items) =>
                      items.filter((item) => item.id !== entry.id),
                    )
                  }
                  aria-label={`Remove alternate ${index + 1}`}
                  disabled={entries.length === 1}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entry.isDefault}
                  onChange={(event) =>
                    update(entry.id, { isDefault: event.target.checked })
                  }
                  className="size-4 accent-[#0051d5]"
                />
                Use as x-default fallback
              </label>
              <div className="grid gap-3 sm:grid-cols-[0.6fr_0.6fr_1.8fr]">
                <Input
                  value={entry.language}
                  onChange={(event) =>
                    update(entry.id, { language: event.target.value })
                  }
                  placeholder="en"
                  aria-label={`Language ${index + 1}`}
                  disabled={entry.isDefault}
                  className="bg-white"
                />
                <Input
                  value={entry.region}
                  onChange={(event) =>
                    update(entry.id, { region: event.target.value })
                  }
                  placeholder="US"
                  aria-label={`Region ${index + 1}`}
                  disabled={entry.isDefault}
                  className="bg-white"
                />
                <Input
                  type="url"
                  value={entry.url}
                  onChange={(event) =>
                    update(entry.id, { url: event.target.value })
                  }
                  placeholder="https://example.com/en/"
                  aria-label={`URL ${index + 1}`}
                  className="bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </ToolPanel>
      <ToolPanel
        id="hreflang-output"
        title="Generated annotations"
        action={
          <ToolStatusBadge
            tone={validEntries.length === entries.length ? "good" : "warning"}
          >
            {validEntries.length}/{entries.length} valid
          </ToolStatusBadge>
        }
      >
        <ToolField htmlFor="hreflang-format" label="Implementation format">
          <select
            id="hreflang-format"
            value={format}
            onChange={(event) => setFormat(event.target.value as typeof format)}
            className="mb-5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="html">HTML link tags</option>
            <option value="header">HTTP Link header</option>
            <option value="xml">XML sitemap fragment</option>
          </select>
        </ToolField>
        <CopyableCode
          code={output || "Add at least one valid alternate."}
          label={
            format === "header"
              ? "Link header"
              : format === "xml"
                ? "XML fragment"
                : "HTML tags"
          }
        />
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
