"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { escapeHtmlAttribute } from "@/lib/tools/generators"

import {
  CopyableCode,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

export function MetaTagGeneratorTool() {
  const [title, setTitle] = useState("Shipyard — Discover outstanding products")
  const [description, setDescription] = useState(
    "Discover useful SaaS, AI, developer, and productivity products, then launch your own product to an audience looking for what is new.",
  )
  const [canonical, setCanonical] = useState("https://shipyardhq.dev/")
  const [author, setAuthor] = useState("Shipyard")
  const [language, setLanguage] = useState("en")
  const [index, setIndex] = useState(true)
  const [follow, setFollow] = useState(true)

  const canonicalValid = useMemo(() => {
    try {
      return ["http:", "https:"].includes(new URL(canonical).protocol)
    } catch {
      return false
    }
  }, [canonical])
  const output = useMemo(() => {
    const lines = [
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      title.trim() ? `<title>${escapeHtmlAttribute(title.trim())}</title>` : "",
      description.trim()
        ? `<meta name=\"description\" content=\"${escapeHtmlAttribute(description.trim())}\" />`
        : "",
      `<meta name=\"robots\" content=\"${index ? "index" : "noindex"}, ${follow ? "follow" : "nofollow"}\" />`,
      canonicalValid
        ? `<link rel=\"canonical\" href=\"${escapeHtmlAttribute(canonical.trim())}\" />`
        : "",
      author.trim()
        ? `<meta name=\"author\" content=\"${escapeHtmlAttribute(author.trim())}\" />`
        : "",
      language.trim()
        ? `<meta http-equiv=\"content-language\" content=\"${escapeHtmlAttribute(language.trim())}\" />`
        : "",
    ]
    return lines.filter(Boolean).join("\n")
  }, [
    author,
    canonical,
    canonicalValid,
    description,
    follow,
    index,
    language,
    title,
  ])

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="meta-inputs"
        title="Page metadata"
        action={
          <ToolStatusBadge tone={!index ? "warning" : "good"}>
            {index ? "Indexable" : "Noindex enabled"}
          </ToolStatusBadge>
        }
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="meta-title"
            label="SEO title"
            hint={`${title.length}/60`}
          >
            <Input
              id="meta-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 border-slate-300 bg-white"
              maxLength={120}
            />
          </ToolField>
          <ToolField
            htmlFor="meta-description"
            label="Meta description"
            hint={`${description.length}/160`}
          >
            <Textarea
              id="meta-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 border-slate-300 bg-white"
              maxLength={320}
            />
          </ToolField>
          <ToolField
            htmlFor="meta-canonical"
            label="Canonical URL"
            error={
              canonical && !canonicalValid
                ? "Enter an absolute HTTP or HTTPS URL."
                : undefined
            }
          >
            <Input
              id="meta-canonical"
              type="url"
              value={canonical}
              onChange={(event) => setCanonical(event.target.value)}
              className="h-10 border-slate-300 bg-white"
              aria-invalid={Boolean(canonical && !canonicalValid)}
            />
          </ToolField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField htmlFor="meta-author" label="Author" hint="Optional">
              <Input
                id="meta-author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
            <ToolField
              htmlFor="meta-language"
              label="Language code"
              hint="BCP 47"
            >
              <Input
                id="meta-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="en-US"
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium">
              Allow indexing
              <input
                type="checkbox"
                checked={index}
                onChange={(event) => setIndex(event.target.checked)}
                className="size-4 accent-[#0051d5]"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium">
              Allow link following
              <input
                type="checkbox"
                checked={follow}
                onChange={(event) => setFollow(event.target.checked)}
                className="size-4 accent-[#0051d5]"
              />
            </label>
          </div>
        </div>
      </ToolPanel>
      <div className="space-y-6">
        <ToolPanel id="meta-summary" title="Metadata checks">
          <div className="grid grid-cols-3 gap-3">
            <ToolMetric
              label="Title"
              value={title.length}
              detail="30–60 is a useful review range"
            />
            <ToolMetric
              label="Description"
              value={description.length}
              detail="120–160 is a useful review range"
            />
            <ToolMetric
              label="Robots"
              value={index ? "index" : "noindex"}
              detail={follow ? "Links may be followed" : "nofollow is enabled"}
            />
          </div>
        </ToolPanel>
        <ToolPanel id="meta-output" title="Generated HTML">
          <CopyableCode code={output} label="Meta tags" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
