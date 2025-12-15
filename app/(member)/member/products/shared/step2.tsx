"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Info, Plus } from "lucide-react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import ImageUploadField from "@/components/molecules/ImageUploadField"
import DeleteButton from "@/components/molecules/DeleteButton"
import { Image } from "@/components/atoms/image"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"

type GalleryMedia = { id: string; imageUrl: string }
type UploadProgress = { total: number; done?: number } | null

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

const INFO_TRIGGER_CLASS =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

export default function StepMedia({
  productId,
  productSlug,
  galleryMedia = [],
  canEditGallery = false,
  maxGallery = 6,
  uploadAsClerkId,
  requireUploadAsClerkId = false,
}: {
  productId?: string
  productSlug?: string
  galleryMedia?: GalleryMedia[]
  canEditGallery?: boolean
  maxGallery?: number
  uploadAsClerkId?: string
  requireUploadAsClerkId?: boolean
}) {
  const router = useRouter()
  const form = useFormContext()
  const draftGalleryUrls = useWatch({
    control: form.control,
    name: "galleryMedia" as any,
  }) as string[] | undefined
  const draftGalleryMedia = useMemo(
    () => {
      const urls = Array.isArray(draftGalleryUrls) ? draftGalleryUrls : []
      return urls
        .filter((url) => typeof url === "string" && url.length)
        .map((url) => ({ id: url, imageUrl: url }))
    },
    [draftGalleryUrls],
  )
  const [busy, setBusy] = useState<null | "upload" | "delete">(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(null)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isDraftMode = !productSlug
  const effectiveMedia = isDraftMode ? draftGalleryMedia : galleryMedia
  const remaining = Math.max(0, (maxGallery ?? 6) - effectiveMedia.length)
  const canEdit = isDraftMode ? true : canEditGallery
  const requiresOwner = isDraftMode && requireUploadAsClerkId && !uploadAsClerkId
  const canUpload =
    remaining > 0 &&
    (isDraftMode ? Boolean(productId) && !requiresOwner : canEditGallery)

  function validateAndSliceFiles(files: FileList | File[]) {
    const all = Array.from(files || [])
    const selected = all.slice(0, remaining)
    if (!selected.length) return { selected: [] as File[], error: null as string | null }

    const invalidType = selected.find((f) => !f.type?.startsWith("image/"))
    if (invalidType) {
      return {
        selected: [] as File[],
        error: `Only images allowed (got ${invalidType.type || "unknown"}).`,
      }
    }

    const tooLarge = selected.find((f) => f.size > MAX_BYTES)
    if (tooLarge) {
      return {
        selected: [] as File[],
        error: `File too large (max 5MB): ${tooLarge.name || "image"}.`,
      }
    }

    return { selected, error: null as string | null }
  }

  async function uploadDraftFiles(files: FileList | File[]) {
    if (!productId) {
      setError("Missing product ID for uploads")
      return
    }
    if (!files || remaining === 0) return

    setBusy("upload")
    setUploadProgress(null)
    setError(null)
    try {
      const { selected, error: validationError } = validateAndSliceFiles(files)
      if (validationError) {
        setError(validationError)
        return
      }
      setUploadProgress({ total: selected.length, done: 0 })
      const results = await Promise.allSettled(
        selected.map(async (file) => {
          try {
            const fd = new FormData()
            fd.append("file", file)
            fd.append("folder", "media")
            fd.append("productId", productId)
            if (uploadAsClerkId) fd.append("asClerkId", uploadAsClerkId)
            const res = await fetch("/api/uploads", { method: "POST", body: fd })
            if (!res.ok) {
              const msg = await res.text().catch(() => "")
              throw new Error(
                msg ? `${file.name || "image"}: ${msg}` : `${file.name || "image"}: Upload failed`,
              )
            }
            const payload = (await res.json()) as { url?: string }
            return payload?.url || null
          } finally {
            setUploadProgress((prev) =>
              prev
                ? { ...prev, done: Math.min(prev.total, (prev.done ?? 0) + 1) }
                : prev,
            )
          }
        }),
      )
      const uploadedUrls = results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((u): u is string => typeof u === "string" && u.length > 0)

      const failures = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      )
      if (failures.length) {
        const first = failures[0]?.reason
        const message =
          first instanceof Error && first.message
            ? first.message
            : "One or more uploads failed"
        setError(
          failures.length > 1
            ? `${message} (+${failures.length - 1} more)`
            : message,
        )
      }
      if (uploadedUrls.length) {
        const current = (form.getValues("galleryMedia" as any) as string[]) || []
        const next = Array.from(new Set([...current, ...uploadedUrls])).slice(
          0,
          maxGallery,
        )
        form.setValue("galleryMedia" as any, next as any, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setBusy(null)
      setUploadProgress(null)
    }
  }

  async function removeDraftUrl(url: string) {
    setBusy("delete")
    setDeletingUrl(url)
    setError(null)
    try {
      const qp = new URLSearchParams({ url })
      if (uploadAsClerkId) qp.set("asClerkId", uploadAsClerkId)
      const res = await fetch(`/api/uploads?${qp.toString()}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
      const current = (form.getValues("galleryMedia" as any) as string[]) || []
      form.setValue(
        "galleryMedia" as any,
        current.filter((u) => u !== url) as any,
        { shouldDirty: true, shouldValidate: true },
      )
    } catch (e: any) {
      setError(e?.message || "Failed to remove")
    } finally {
      setDeletingUrl(null)
      setBusy(null)
    }
  }

  async function uploadSavedFiles(files: FileList | File[]) {
    if (!productSlug || !canEditGallery || remaining === 0) return

    setBusy("upload")
    setUploadProgress(null)
    setError(null)
    try {
      const { selected, error: validationError } = validateAndSliceFiles(files)
      if (validationError) {
        setError(validationError)
        return
      }
      const fd = new FormData()
      setUploadProgress({ total: selected.length })
      for (const file of selected) {
        fd.append("file", file)
      }
      const res = await fetch(`/api/products/${productSlug}/media`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setBusy(null)
      setUploadProgress(null)
    }
  }

  async function removeSavedMedia(id: string) {
    if (!productSlug || !canEditGallery) return

    setBusy("delete")
    setDeletingUrl(id)
    setError(null)
    try {
      const res = await fetch(`/api/products/${productSlug}/media/${id}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Failed to remove")
    } finally {
      setDeletingUrl(null)
      setBusy(null)
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    if (isDraftMode) return uploadDraftFiles(files)
    return uploadSavedFiles(files)
  }

  function uploadingText() {
    if (busy !== "upload") return null
    if (
      uploadProgress?.total &&
      uploadProgress.done !== null &&
      uploadProgress.done !== undefined
    ) {
      return `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
    }
    if (uploadProgress?.total) return `Uploading ${uploadProgress.total} image${uploadProgress.total === 1 ? "" : "s"}…`
    return "Uploading…"
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white/80 p-4 sm:p-5">
        {requiresOwner ? (
          <div className="mb-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Select an owner to upload logo, banner, and screenshots.
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            name="logo"
            control={form.control}
            render={() => (
              <FormItem>
                <ImageUploadField
                  name="logo"
                  label={
                    <span className="inline-flex items-center gap-2">
                      Logo
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={INFO_TRIGGER_CLASS}
                            aria-label="Logo help"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          Square logo recommended (e.g. 272×272). Used across badges and cards.
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs font-normal text-muted-foreground">
                        Required
                      </span>
                    </span>
                  }
                  folder="logos"
                  productId={productId}
                  asClerkId={uploadAsClerkId}
                  disabled={requiresOwner}
                  placeholder="Drag & drop a square logo"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="bannerImage"
            control={form.control}
            render={() => (
              <FormItem>
                <ImageUploadField
                  name="bannerImage"
                  label={
                    <span className="inline-flex items-center gap-2">
                      Social banner
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={INFO_TRIGGER_CLASS}
                            aria-label="Social banner help"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          Optional. 1200×628 recommended for link previews (X/LinkedIn/Slack).
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  }
                  folder="banners"
                  productId={productId}
                  asClerkId={uploadAsClerkId}
                  disabled={requiresOwner}
                  placeholder="Drag & drop a banner image"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white/80 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FormLabel className="flex items-center gap-2">
            Screenshots
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={INFO_TRIGGER_CLASS}
                  aria-label="Screenshots help"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Add 3–6 screenshots (16:9 works well). Max 5MB each.
              </TooltipContent>
            </Tooltip>
          </FormLabel>
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>Optional</span>
            <span>
              {effectiveMedia.length}/{maxGallery}
            </span>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {requiresOwner ? (
          <div className="mb-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Select an owner to upload screenshots.
          </div>
        ) : null}

        {!canUpload && isDraftMode && !productId ? (
          <div className="mb-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Save your draft to upload screenshots.
          </div>
        ) : null}

        {effectiveMedia.length ? (
          <div className="relative">
            {busy === "upload" ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  {uploadingText()}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {effectiveMedia.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-video overflow-hidden rounded border bg-background"
                >
                  <Image
                    src={m.imageUrl}
                    alt=""
                    fill
                    className="object-contain object-center"
                    quality={95}
                  />
                  {busy === "delete" &&
                  deletingUrl &&
                  (deletingUrl === m.id || deletingUrl === m.imageUrl) ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        Deleting…
                      </div>
                    </div>
                  ) : null}
                  {canEdit ? (
                    <div className="absolute right-2 top-2">
                      <DeleteButton
                        size="sm"
                        onClick={() =>
                          isDraftMode
                            ? removeDraftUrl(m.imageUrl)
                            : removeSavedMedia(m.id)
                        }
                        disabled={busy === "upload" || deletingUrl === m.id || deletingUrl === m.imageUrl}
                        aria-label="Remove image"
                        title="Remove image"
                      />
                    </div>
                  ) : null}
                </div>
              ))}

              {canUpload ? (
                <label
                  className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed bg-muted/10 text-center text-sm text-muted-foreground hover:bg-muted/20"
                  onDrop={(e) => {
                    e.preventDefault()
                    if (!e.dataTransfer.files?.length) return
                    uploadFiles(e.dataTransfer.files)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  aria-busy={busy === "upload"}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                    disabled={busy === "upload" || !canUpload}
                  />
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <div className="text-xs">Add ({remaining} left)</div>
                </label>
              ) : null}
            </div>
          </div>
        ) : (
          <label
            className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed bg-muted/10 p-6 text-center text-sm hover:bg-muted/20"
            onDrop={(e) => {
              e.preventDefault()
              if (!e.dataTransfer.files?.length) return
              uploadFiles(e.dataTransfer.files)
            }}
            onDragOver={(e) => e.preventDefault()}
            aria-busy={busy === "upload"}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              disabled={busy === "upload" || !canUpload}
            />
            <div className="space-y-1">
              <div className="font-medium">
                {busy === "upload" ? uploadingText() : "Drag & drop screenshots (or click)"}
              </div>
              <div className="text-xs text-muted-foreground">
                {canUpload ? `Add up to ${remaining}.` : requiresOwner ? "Select an owner to upload." : "Uploads unavailable."}
              </div>
            </div>
          </label>
        )}
      </div>
    </div>
  )
}
