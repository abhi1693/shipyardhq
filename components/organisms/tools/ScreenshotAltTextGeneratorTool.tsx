"use client"

import { useState, type ChangeEvent } from "react"
import { ImageIcon } from "lucide-react"

import { Checkbox } from "@/components/atoms/checkbox"
import { Image } from "@/components/atoms/image"
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Textarea } from "@/components/atoms/textarea"

import {
  CopyableCode,
  CopyTextButton,
  DownloadTextButton,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

type ScreenshotType = "product" | "mobile" | "chart" | "marketing" | "logo"

type PreviewImage = {
  src: string
  name: string
  size: number
  width: number
  height: number
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const typePrefixes: Record<ScreenshotType, string> = {
  product: "Screenshot of",
  mobile: "Mobile screen showing",
  chart: "Chart showing",
  marketing: "Product graphic showing",
  logo: "Logo for",
}

function normalizeFragment(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/, "")
}

function buildAltText({
  screenshotType,
  subject,
  detail,
  context,
  visibleText,
  includeVisibleText,
  decorative,
}: {
  screenshotType: ScreenshotType
  subject: string
  detail: string
  context: string
  visibleText: string
  includeVisibleText: boolean
  decorative: boolean
}) {
  if (decorative) return ""

  const cleanedSubject = normalizeFragment(subject)
  if (!cleanedSubject) return ""

  const cleanedDetail = normalizeFragment(detail)
  const cleanedContext = normalizeFragment(context)
  const cleanedVisibleText = normalizeFragment(visibleText)
  let alt = `${typePrefixes[screenshotType]} ${cleanedSubject}`

  if (cleanedDetail) alt += `, ${cleanedDetail}`
  if (cleanedContext) alt += `, ${cleanedContext}`
  if (includeVisibleText && cleanedVisibleText) {
    alt += `. Visible text: “${cleanedVisibleText}”`
  }

  return `${alt}.`.replace("..", ".")
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ScreenshotAltTextGeneratorTool() {
  const [preview, setPreview] = useState<PreviewImage | null>(null)
  const [fileError, setFileError] = useState("")
  const [screenshotType, setScreenshotType] =
    useState<ScreenshotType>("product")
  const [subject, setSubject] = useState("Shipyard launch analytics dashboard")
  const [detail, setDetail] = useState(
    "displaying weekly product views, clicks, and referral sources",
  )
  const [context, setContext] = useState("after a product launch")
  const [visibleText, setVisibleText] = useState(
    "1,248 views and 326 website clicks",
  )
  const [includeVisibleText, setIncludeVisibleText] = useState(true)
  const [decorative, setDecorative] = useState(false)

  const altText = buildAltText({
    screenshotType,
    subject,
    detail,
    context,
    visibleText,
    includeVisibleText,
    decorative,
  })
  const htmlSnippet = `<img src="/images/product-screenshot.webp" alt="${escapeHtml(altText)}" />`
  const lengthState = decorative
    ? { label: "Empty alt is correct", tone: "good" as const }
    : !altText
      ? { label: "Describe the subject", tone: "neutral" as const }
      : altText.length <= 160
        ? { label: "Concise description", tone: "good" as const }
        : { label: "Review for unnecessary detail", tone: "warning" as const }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileError("")
    if (!file) return

    if (!IMAGE_TYPES.has(file.type)) {
      setPreview(null)
      setFileError("Choose a PNG, JPG, WebP, or GIF image.")
      event.target.value = ""
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPreview(null)
      setFileError("Choose an image smaller than 10 MB.")
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      setPreview(null)
      setFileError("The image could not be read. Try another file.")
    }
    reader.onload = () => {
      if (typeof reader.result !== "string") return
      const source = reader.result
      const image = new window.Image()
      image.onerror = () => {
        setPreview(null)
        setFileError("The image could not be previewed. Try another file.")
      }
      image.onload = () => {
        setPreview({
          src: source,
          name: file.name,
          size: file.size,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  }

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="alt-input"
        title="Describe the screenshot"
        description="Your image stays in this browser. The tool structures the details you provide; it does not send the image to an AI service."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="alt-image"
            label="Product screenshot"
            hint="Optional · up to 10 MB"
            error={fileError || undefined}
          >
            <Input
              id="alt-image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImage}
              aria-invalid={Boolean(fileError)}
              aria-describedby={fileError ? "alt-image-error" : undefined}
              className="h-auto py-1.5"
            />
          </ToolField>

          {preview ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative flex min-h-44 items-center justify-center p-3">
                <Image
                  src={preview.src}
                  alt=""
                  width={preview.width}
                  height={preview.height}
                  unoptimized
                  placeholder="empty"
                  className="max-h-72 w-auto rounded-md object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <span className="max-w-full truncate">{preview.name}</span>
                <span className="shrink-0 tabular-nums">
                  {preview.width} × {preview.height} ·{" "}
                  {formatFileSize(preview.size)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
              <div>
                <ImageIcon
                  className="mx-auto size-5 text-slate-400"
                  aria-hidden="true"
                />
                <p className="mt-2 text-pretty text-xs text-slate-500">
                  Uploading a reference helps you review your wording beside the
                  image.
                </p>
              </div>
            </div>
          )}

          <ToolField htmlFor="alt-type" label="Image type">
            <Select
              value={screenshotType}
              onValueChange={(value) =>
                setScreenshotType(value as ScreenshotType)
              }
              disabled={decorative}
            >
              <SelectTrigger id="alt-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">
                  Desktop product screenshot
                </SelectItem>
                <SelectItem value="mobile">Mobile app screen</SelectItem>
                <SelectItem value="chart">
                  Chart or data visualization
                </SelectItem>
                <SelectItem value="marketing">Marketing graphic</SelectItem>
                <SelectItem value="logo">Product logo</SelectItem>
              </SelectContent>
            </Select>
          </ToolField>

          <ToolField
            htmlFor="alt-subject"
            label="Main subject"
            required={!decorative}
            error={
              !decorative && !subject.trim()
                ? "Describe the product screen or visual."
                : undefined
            }
          >
            <Input
              id="alt-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Acme project analytics dashboard"
              disabled={decorative}
              aria-invalid={!decorative && !subject.trim()}
              aria-describedby={
                !decorative && !subject.trim() ? "alt-subject-error" : undefined
              }
              maxLength={160}
            />
          </ToolField>

          <ToolField
            htmlFor="alt-detail"
            label="Important action or detail"
            hint="Optional"
          >
            <Input
              id="alt-detail"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="showing a rising weekly active-user chart"
              disabled={decorative}
              maxLength={220}
            />
          </ToolField>

          <ToolField
            htmlFor="alt-context"
            label="Relevant context"
            hint="Optional"
          >
            <Input
              id="alt-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="after publishing a product launch"
              disabled={decorative}
              maxLength={160}
            />
          </ToolField>

          <ToolField
            htmlFor="alt-visible-text"
            label="Meaningful text visible in the image"
            hint="Optional"
          >
            <Textarea
              id="alt-visible-text"
              value={visibleText}
              onChange={(event) => setVisibleText(event.target.value)}
              placeholder="Weekly active users: 1,248"
              disabled={decorative}
              className="min-h-20 resize-y"
              maxLength={300}
            />
          </ToolField>

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-900">
              Accessibility options
            </legend>
            <div className="flex items-start gap-3">
              <Checkbox
                id="alt-include-visible-text"
                checked={includeVisibleText}
                onCheckedChange={(checked) =>
                  setIncludeVisibleText(checked === true)
                }
                disabled={decorative || !visibleText.trim()}
              />
              <Label
                htmlFor="alt-include-visible-text"
                className="items-start text-pretty leading-5"
              >
                Include meaningful visible text in the description
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="alt-decorative"
                checked={decorative}
                onCheckedChange={(checked) => setDecorative(checked === true)}
              />
              <Label
                htmlFor="alt-decorative"
                className="items-start text-pretty leading-5"
              >
                This image is purely decorative; generate an empty alt attribute
              </Label>
            </div>
          </fieldset>
        </div>
      </ToolPanel>

      <div className="space-y-6">
        <ToolPanel
          id="alt-result"
          title="Generated alt text"
          description="Describe the image’s purpose in this page context, not every visual detail."
          action={
            <ToolStatusBadge tone={lengthState.tone}>
              {lengthState.label}
            </ToolStatusBadge>
          }
        >
          <div aria-live="polite" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {decorative ? (
                <p className="font-mono text-sm text-slate-800">
                  alt=&quot;&quot;
                </p>
              ) : altText ? (
                <p className="text-pretty text-sm leading-6 text-slate-800">
                  {altText}
                </p>
              ) : (
                <p className="text-pretty text-sm text-slate-500">
                  Add a main subject to generate the description.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyTextButton
                text={decorative ? 'alt=""' : altText}
                label={decorative ? "Copy attribute" : "Copy alt text"}
                disabled={!decorative && !altText}
              />
              <DownloadTextButton
                content={decorative ? 'alt=""' : altText}
                filename="product-screenshot-alt-text.txt"
                label="Download"
                disabled={!decorative && !altText}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ToolMetric
                label="Characters"
                value={altText.length}
                detail="There is no universal hard limit"
              />
              <ToolMetric
                label="Words"
                value={altText ? altText.split(/\s+/).length : 0}
                detail="Keep only contextually useful detail"
              />
            </div>
          </div>
        </ToolPanel>

        <ToolPanel
          id="alt-html"
          title="HTML example"
          description="Replace the example source path with your actual optimized image URL."
        >
          <CopyableCode code={htmlSnippet} label="HTML" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
