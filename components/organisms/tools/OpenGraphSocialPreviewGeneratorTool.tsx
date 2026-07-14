"use client"

import { useMemo, useState } from "react"
import { ImageIcon } from "lucide-react"

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
import { generateOpenGraphTags } from "@/lib/tools/generators"

const inputClassName =
  "h-10 border-slate-300 bg-white text-slate-950 focus-visible:border-[#0051d5] focus-visible:ring-[#0051d5]/20"

export function OpenGraphSocialPreviewGeneratorTool() {
  const [title, setTitle] = useState("Launch your startup on Shipyard")
  const [description, setDescription] = useState(
    "Share your product with founders, early adopters, and people looking for their next favorite tool.",
  )
  const [url, setUrl] = useState("https://example.com/launch")
  const [imageUrl, setImageUrl] = useState("")
  const [siteName, setSiteName] = useState("My Startup")
  const [twitterCard, setTwitterCard] = useState<
    "summary" | "summary_large_image"
  >("summary_large_image")

  const code = useMemo(
    () =>
      generateOpenGraphTags({
        title,
        description,
        url,
        imageUrl,
        siteName,
        twitterCard,
      }),
    [description, imageUrl, siteName, title, twitterCard, url],
  )
  const safeImageUrl = imageUrl.replace(/"/g, "%22")
  const titleLength = title.trim().length
  const descriptionLength = description.trim().length

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="open-graph-inputs"
        title="Social sharing details"
        description="Edit the fields and the social card and meta tags update instantly."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="og-title"
            label="Page title"
            hint={`${titleLength}/60`}
            required
          >
            <Input
              id="og-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClassName}
              maxLength={120}
            />
          </ToolField>
          <ToolField
            htmlFor="og-description"
            label="Description"
            hint={`${descriptionLength}/160`}
            required
          >
            <Textarea
              id="og-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 border-slate-300 bg-white text-slate-950 focus-visible:border-[#0051d5] focus-visible:ring-[#0051d5]/20"
              maxLength={300}
            />
          </ToolField>
          <ToolField htmlFor="og-url" label="Page URL" required>
            <Input
              id="og-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://example.com/launch"
            />
          </ToolField>
          <ToolField htmlFor="og-image" label="Social image URL">
            <Input
              id="og-image"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://example.com/social-card.png"
            />
          </ToolField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField htmlFor="og-site-name" label="Site name">
              <Input
                id="og-site-name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                className={inputClassName}
              />
            </ToolField>
            <ToolField htmlFor="twitter-card" label="X card style">
              <select
                id="twitter-card"
                value={twitterCard}
                onChange={(event) =>
                  setTwitterCard(
                    event.target.value as "summary" | "summary_large_image",
                  )
                }
                className={`${inputClassName} w-full rounded-md border px-3 text-sm outline-none`}
              >
                <option value="summary_large_image">Large image</option>
                <option value="summary">Compact</option>
              </select>
            </ToolField>
          </div>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="open-graph-preview"
          title="Social card preview"
          description="Platforms can crop or restyle cards, so treat this as a close visual check."
          action={
            <ToolStatusBadge
              tone={
                titleLength > 60 || descriptionLength > 160 ? "warning" : "good"
              }
            >
              {titleLength > 60 || descriptionLength > 160
                ? "May truncate"
                : "Good length"}
            </ToolStatusBadge>
          }
        >
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div
              className="flex aspect-[1.91/1] items-center justify-center bg-slate-100 bg-cover bg-center"
              style={
                safeImageUrl
                  ? { backgroundImage: `url("${safeImageUrl}")` }
                  : undefined
              }
              role="img"
              aria-label={
                imageUrl
                  ? "Preview of the supplied social image"
                  : "Social image placeholder"
              }
            >
              {!imageUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImageIcon className="size-9" aria-hidden="true" />
                  <span className="text-xs font-medium">
                    1200 × 630 recommended
                  </span>
                </div>
              ) : null}
            </div>
            <div className="space-y-1 border-t border-slate-200 p-4">
              <p className="truncate text-xs uppercase tracking-wide text-slate-500">
                {siteName || "Website"}
              </p>
              <p className="line-clamp-2 font-semibold text-slate-950">
                {title || "Your page title"}
              </p>
              <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                {description || "Your social description appears here."}
              </p>
              <p className="truncate text-xs text-slate-500">{url}</p>
            </div>
          </div>
        </ToolPanel>

        <ToolPanel
          id="open-graph-code"
          title="Generated meta tags"
          description="Paste these tags inside your page's <head>."
          action={
            <DownloadTextButton
              content={code}
              filename="social-meta-tags.html"
              label="Download"
              mimeType="text/html;charset=utf-8"
            />
          }
        >
          <CopyableCode code={code} label="HTML meta tags" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
