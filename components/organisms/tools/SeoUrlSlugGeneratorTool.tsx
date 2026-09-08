"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"

import { Checkbox } from "@/components/atoms/checkbox"
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"
import { extractSeoSlugSource } from "@/lib/tools/generators"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

import {
  CopyTextButton,
  ToolEmptyState,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "with",
  "your",
])

const DATE_WORDS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
])

function toWords(value: string) {
  return extractSeoSlugSource(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function fitWords(words: string[], maximumLength: number, separator: string) {
  const fitted: string[] = []

  for (const word of words) {
    const candidate = [...fitted, word].join(separator)
    if (candidate.length > maximumLength) break
    fitted.push(word)
  }

  if (fitted.length) return fitted
  return words[0] ? [words[0].slice(0, maximumLength)] : []
}

function createSlug({
  source,
  focusKeyword,
  separator,
  removeStopWords,
  removeDates,
  addFocusKeyword,
  maximumLength,
}: {
  source: string
  focusKeyword: string
  separator: string
  removeStopWords: boolean
  removeDates: boolean
  addFocusKeyword: boolean
  maximumLength: number
}) {
  let words = toWords(source)
  const originalWords = words

  if (removeStopWords) {
    words = words.filter((word) => !STOP_WORDS.has(word))
  }
  if (removeDates) {
    words = words.filter(
      (word) => !DATE_WORDS.has(word) && !/^(?:19|20)\d{2}$/.test(word),
    )
  }
  if (!words.length) words = originalWords

  const focusWords = toWords(focusKeyword)
  const focusSlug = focusWords.join(separator)
  const baseSlug = words.join(separator)
  if (addFocusKeyword && focusWords.length && !baseSlug.includes(focusSlug)) {
    words = [...focusWords, ...words]
  }

  return fitWords(words, maximumLength, separator).join(separator)
}

function getBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) return { valid: true, value: "https://example.com" }

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    )
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Invalid protocol")
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "")
    return { valid: true, value: `${url.origin}${pathname}` }
  } catch {
    return { valid: false, value: "https://example.com" }
  }
}

export function SeoUrlSlugGeneratorTool() {
  const [source, setSource] = useState(
    "The Complete Guide to Launching Your SaaS Product in 2026",
  )
  const [focusKeyword, setFocusKeyword] = useState("launch saas product")
  const [baseUrl, setBaseUrl] = useState("https://shipyardhq.dev/guides")
  const [separator, setSeparator] = useState("-")
  const [removeStopWords, setRemoveStopWords] = useState(true)
  const [removeDates, setRemoveDates] = useState(true)
  const [addFocusKeyword, setAddFocusKeyword] = useState(false)
  const [maximumLength, setMaximumLength] = useState(60)

  const maximumLengthIsValid = maximumLength >= 20 && maximumLength <= 120
  const safeMaximumLength = Math.min(120, Math.max(20, maximumLength || 20))
  const slug = createSlug({
    source,
    focusKeyword,
    separator,
    removeStopWords,
    removeDates,
    addFocusKeyword,
    maximumLength: safeMaximumLength,
  })
  const resolvedBaseUrl = getBaseUrl(baseUrl)
  const fullUrl = `${resolvedBaseUrl.value}/${slug}`
  const focusSlug = toWords(focusKeyword).join(separator)
  const includesFocusKeyword = Boolean(focusSlug && slug.includes(focusSlug))
  const slugState = !slug
    ? { label: "Waiting for a title", tone: "neutral" as const }
    : slug.length <= 60
      ? { label: "Concise", tone: "good" as const }
      : slug.length <= 75
        ? { label: "Consider shortening", tone: "warning" as const }
        : { label: "Long URL", tone: "danger" as const }

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="slug-input"
        title="URL details"
        description="Turn a page title or an existing URL into a clean, readable slug."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="slug-source"
            label="Page title or existing URL"
            required
            error={
              !source.trim()
                ? "Add a title or URL to create a slug."
                : undefined
            }
          >
            <Input
              id="slug-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="How to launch your first SaaS product"
              aria-invalid={!source.trim()}
              aria-describedby={
                !source.trim() ? "slug-source-error" : undefined
              }
              maxLength={300}
            />
          </ToolField>

          <ToolField
            htmlFor="slug-keyword"
            label="Focus phrase"
            hint="Optional"
          >
            <Input
              id="slug-keyword"
              value={focusKeyword}
              onChange={(event) => setFocusKeyword(event.target.value)}
              placeholder="launch saas product"
              maxLength={100}
            />
          </ToolField>

          <ToolField
            htmlFor="slug-base-url"
            label="Site or section URL"
            error={
              !resolvedBaseUrl.valid
                ? "Enter a valid HTTP or HTTPS web address."
                : undefined
            }
          >
            <Input
              id="slug-base-url"
              type="url"
              inputMode="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://example.com/blog"
              aria-invalid={!resolvedBaseUrl.valid}
              aria-describedby={
                !resolvedBaseUrl.valid ? "slug-base-url-error" : undefined
              }
              maxLength={240}
            />
          </ToolField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToolField htmlFor="slug-separator" label="Word separator">
              <Select value={separator} onValueChange={setSeparator}>
                <SelectTrigger id="slug-separator" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Hyphen (recommended)</SelectItem>
                  <SelectItem value="_">Underscore</SelectItem>
                </SelectContent>
              </Select>
            </ToolField>

            <ToolField
              htmlFor="slug-max-length"
              label="Maximum length"
              hint="20–120"
              error={
                !maximumLengthIsValid
                  ? "Choose a maximum between 20 and 120 characters."
                  : undefined
              }
            >
              <Input
                id="slug-max-length"
                type="number"
                min={20}
                max={120}
                value={maximumLength}
                onChange={(event) =>
                  setMaximumLength(event.currentTarget.valueAsNumber || 20)
                }
                inputMode="numeric"
                aria-invalid={!maximumLengthIsValid}
                aria-describedby={
                  !maximumLengthIsValid ? "slug-max-length-error" : undefined
                }
              />
            </ToolField>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-900">
              Cleanup options
            </legend>
            <div className="flex items-start gap-3">
              <Checkbox
                id="slug-remove-stop-words"
                checked={removeStopWords}
                onCheckedChange={(checked) =>
                  setRemoveStopWords(checked === true)
                }
              />
              <Label
                htmlFor="slug-remove-stop-words"
                className="items-start text-pretty leading-5"
              >
                Remove common filler words such as “the”, “of”, and “your”
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="slug-remove-dates"
                checked={removeDates}
                onCheckedChange={(checked) => setRemoveDates(checked === true)}
              />
              <Label
                htmlFor="slug-remove-dates"
                className="items-start text-pretty leading-5"
              >
                Remove years and month names to keep evergreen URLs
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="slug-add-focus"
                checked={addFocusKeyword}
                onCheckedChange={(checked) =>
                  setAddFocusKeyword(checked === true)
                }
                disabled={!focusKeyword.trim()}
              />
              <Label
                htmlFor="slug-add-focus"
                className="items-start text-pretty leading-5"
              >
                Add the focus phrase when it is missing
              </Label>
            </div>
          </fieldset>
        </div>
      </ToolPanel>

      <ToolPanel
        id="slug-result"
        title="Generated URL"
        description="Review the slug before publishing. Changing a live URL later can require redirects."
        action={
          <ToolStatusBadge tone={slugState.tone}>
            {slugState.label}
          </ToolStatusBadge>
        }
      >
        {!slug ? (
          <ToolEmptyState
            title="Add a page title"
            description="A cleaned slug and full URL preview will appear here as you type."
          />
        ) : (
          <div aria-live="polite" className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                  <Link2 className="size-4" aria-hidden="true" />
                </span>
                <p className="min-w-0 break-all text-sm leading-6 text-slate-800">
                  <span className="text-slate-500">
                    {resolvedBaseUrl.value}/
                  </span>
                  <strong className="font-semibold text-blue-800">
                    {slug}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyTextButton text={slug} label="Copy slug" />
              <CopyTextButton
                text={fullUrl}
                label="Copy full URL"
                disabled={!resolvedBaseUrl.valid}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ToolMetric
                label="Slug length"
                value={slug.length}
                detail={`Limit set to ${safeMaximumLength}`}
              />
              <ToolMetric
                label="Words"
                value={slug.split(separator).filter(Boolean).length}
                detail="Fewer, descriptive words scan well"
              />
            </div>

            {focusKeyword.trim() ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">
                    Focus phrase
                  </p>
                  <ToolStatusBadge
                    tone={includesFocusKeyword ? "good" : "warning"}
                  >
                    {includesFocusKeyword ? "Included" : "Not an exact match"}
                  </ToolStatusBadge>
                </div>
                <p className="mt-2 text-pretty text-xs leading-5 text-slate-500">
                  Exact-match wording is optional. Keep the URL accurate, short,
                  and understandable to people first.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
