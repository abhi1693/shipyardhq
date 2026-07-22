"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/atoms/input"

import {
  CopyableCode,
  CopyTextButton,
  ToolField,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

function normalizeCampaignValue(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, "_")
}

export function UtmBuilderTool() {
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com/launch")
  const [source, setSource] = useState("newsletter")
  const [medium, setMedium] = useState("email")
  const [campaign, setCampaign] = useState("summer_launch")
  const [term, setTerm] = useState("")
  const [content, setContent] = useState("")

  const result = useMemo(() => {
    try {
      const url = new URL(websiteUrl.trim())
      if (!["http:", "https:"].includes(url.protocol)) throw new Error()
      const values = {
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
      }
      for (const [key, value] of Object.entries(values)) {
        const normalized = normalizeCampaignValue(value)
        if (normalized) url.searchParams.set(key, normalized)
        else url.searchParams.delete(key)
      }
      return { valid: true, url: url.toString() }
    } catch {
      return { valid: false, url: "" }
    }
  }, [campaign, content, medium, source, term, websiteUrl])

  const requiredComplete = Boolean(
    source.trim() && medium.trim() && campaign.trim(),
  )

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="utm-inputs"
        title="Campaign details"
        description="Values are normalized to lowercase with underscores for consistent analytics rows."
        action={
          <ToolStatusBadge
            tone={result.valid && requiredComplete ? "good" : "warning"}
          >
            {result.valid && requiredComplete
              ? "Ready"
              : "Complete required fields"}
          </ToolStatusBadge>
        }
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="utm-url"
            label="Destination URL"
            required
            error={
              !result.valid ? "Enter an absolute HTTP or HTTPS URL." : undefined
            }
          >
            <Input
              id="utm-url"
              type="url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              className="h-11 border-slate-300 bg-white"
              aria-invalid={!result.valid}
            />
          </ToolField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField
              htmlFor="utm-source"
              label="Campaign source"
              hint="Required"
            >
              <Input
                id="utm-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="newsletter"
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
            <ToolField
              htmlFor="utm-medium"
              label="Campaign medium"
              hint="Required"
            >
              <Input
                id="utm-medium"
                value={medium}
                onChange={(event) => setMedium(event.target.value)}
                placeholder="email"
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
          </div>
          <ToolField
            htmlFor="utm-campaign"
            label="Campaign name"
            hint="Required"
          >
            <Input
              id="utm-campaign"
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              placeholder="summer_launch"
              className="h-10 border-slate-300 bg-white"
            />
          </ToolField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField htmlFor="utm-term" label="Campaign term" hint="Optional">
              <Input
                id="utm-term"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="founder_tools"
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
            <ToolField
              htmlFor="utm-content"
              label="Campaign content"
              hint="Optional"
            >
              <Input
                id="utm-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="header_cta"
                className="h-10 border-slate-300 bg-white"
              />
            </ToolField>
          </div>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="utm-result"
          title="Campaign URL"
          description="Existing query parameters are preserved."
          action={
            <CopyTextButton
              text={requiredComplete ? result.url : ""}
              label="Copy URL"
            />
          }
        >
          <CopyableCode
            code={
              requiredComplete && result.url
                ? result.url
                : "Complete the required fields to build a URL."
            }
            label="Campaign URL"
            showHeader={false}
          />
        </ToolPanel>
        <ToolPanel id="utm-safety" title="Naming and privacy check">
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>
              <strong className="text-slate-900">Normalized:</strong> spaces
              become underscores and letters become lowercase.
            </li>
            <li>
              <strong className="text-slate-900">Public:</strong> never include
              email addresses, customer IDs, tokens, or secrets in campaign
              parameters.
            </li>
            <li>
              <strong className="text-slate-900">Transparent:</strong> this tool
              deliberately does not hide the destination behind a third-party
              shortener.
            </li>
          </ul>
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
