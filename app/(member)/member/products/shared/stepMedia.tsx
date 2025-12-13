"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FormField,
  FormItem,
  FormMessage,
} from "@/components/atoms/form"
import ImageUploadField from "@/components/molecules/ImageUploadField"
import DeleteButton from "@/components/molecules/DeleteButton"
import { Image } from "@/components/atoms/image"

type GalleryMedia = { id: string; imageUrl: string }

export default function StepMedia({
  productId,
  productSlug,
  galleryMedia = [],
  canEditGallery = false,
  maxGallery = 6,
}: {
  productId?: string
  productSlug?: string
  galleryMedia?: GalleryMedia[]
  canEditGallery?: boolean
  maxGallery?: number
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
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isDraftMode = !productSlug
  const effectiveMedia = isDraftMode ? draftGalleryMedia : galleryMedia
  const remaining = Math.max(0, (maxGallery ?? 6) - effectiveMedia.length)

  async function uploadDraftFiles(files: FileList | File[]) {
    if (!productId) {
      setError("Missing product ID for uploads")
      return
    }
    if (!files || remaining === 0) return

    setBusy("upload")
    setError(null)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const uploadedUrls: string[] = []
      for (const file of selected) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("folder", "media")
        fd.append("productId", productId)
        const res = await fetch("/api/uploads", { method: "POST", body: fd })
        if (!res.ok) throw new Error(await res.text())
        const payload = (await res.json()) as { url?: string }
        if (payload?.url) uploadedUrls.push(payload.url)
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
    }
  }

  async function removeDraftUrl(url: string) {
    setBusy("delete")
    setDeletingUrl(url)
    setError(null)
    try {
      const res = await fetch(`/api/uploads?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
    } catch (e: any) {
      setError(e?.message || "Failed to remove")
    } finally {
      const current = (form.getValues("galleryMedia" as any) as string[]) || []
      form.setValue(
        "galleryMedia" as any,
        current.filter((u) => u !== url) as any,
        { shouldDirty: true, shouldValidate: true },
      )
      setDeletingUrl(null)
      setBusy(null)
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    if (!e.dataTransfer.files?.length) return
    uploadDraftFiles(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
  }

  async function uploadSavedFiles(files: FileList | File[]) {
    if (!productSlug || !canEditGallery || remaining === 0) return

    setBusy("upload")
    setError(null)
    try {
      const fd = new FormData()
      const selected = Array.from(files).slice(0, remaining)
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          name="logo"
          control={form.control}
          render={() => (
            <FormItem>
              <ImageUploadField
                name="logo"
                label="Logo"
                folder="logos"
                productId={productId}
                placeholder="Drag & drop a square logo (or click to upload)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Recommended size: 272×272 (square). Logos are displayed up to
                136×136 across badges and cards.
              </p>
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
                label="Social Share Banner"
                folder="banners"
                productId={productId}
                placeholder="Drag & drop a banner image (or click to upload)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Shows on link previews (X/LinkedIn/Slack). If you skip it, we’ll
                use your logo. Recommended size: 1200×628 (≈1.91:1 aspect).
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="rounded-xl border bg-white/80 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground">
            Images: {effectiveMedia.length}/{maxGallery}
          </div>
          <div className="text-muted-foreground">
            Tips: 3–6 screenshots (1280×720). Banner 1200×628.
          </div>
        </div>

        {error ? (
          <div className="mb-3 text-sm text-destructive">{error}</div>
        ) : null}

        {productSlug ? (
          <div className="space-y-3">
            {canEditGallery && remaining > 0 ? (
              <label
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed bg-muted/10 p-4 text-center text-sm hover:bg-muted/20"
                onDrop={(e) => {
                  e.preventDefault()
                  if (!e.dataTransfer.files?.length) return
                  uploadSavedFiles(e.dataTransfer.files)
                }}
                onDragOver={(e) => e.preventDefault()}
                aria-busy={busy === "upload"}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && uploadSavedFiles(e.target.files)
                  }
                  disabled={busy === "upload" || remaining === 0}
                />
                <div className="space-y-1">
                  <div className="font-medium">
                    {busy === "upload"
                      ? "Uploading…"
                      : "Drag & drop screenshots (or click to upload)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add up to {remaining} more (max 5MB each).
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add screenshots people can browse on your product page.
                  </div>
                </div>
              </label>
            ) : null}

            {effectiveMedia.length ? (
              <div className="relative">
                {busy === "upload" ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      Uploading…
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
                      {busy === "delete" && deletingUrl === m.id ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                            Deleting…
                          </div>
                        </div>
                      ) : null}
                      {canEditGallery ? (
                        <div className="absolute right-2 top-2">
                          <DeleteButton
                            size="sm"
                            onClick={() => removeSavedMedia(m.id)}
                            disabled={busy === "upload" || deletingUrl === m.id}
                            aria-label="Remove image"
                            title="Remove image"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                Drag & drop screenshots above (or click to upload).
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {remaining > 0 ? (
              <label
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed bg-muted/10 p-4 text-center text-sm hover:bg-muted/20"
                onDrop={onDrop}
                onDragOver={onDragOver}
                aria-busy={busy === "upload"}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && uploadDraftFiles(e.target.files)
                  }
                  disabled={busy === "upload" || remaining === 0}
                />
                <div className="space-y-1">
                  <div className="font-medium">
                    {busy === "upload"
                      ? "Uploading…"
                      : "Drag & drop screenshots (or click to upload)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add up to {remaining} more (max 5MB each).
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add screenshots people can browse on your product page.
                  </div>
                </div>
              </label>
            ) : null}

            {effectiveMedia.length ? (
              <div className="relative">
                {busy === "upload" ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      Uploading…
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
                      {busy === "delete" && deletingUrl === m.imageUrl ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                            Deleting…
                          </div>
                        </div>
                      ) : null}
                      <div className="absolute right-2 top-2">
                        <DeleteButton
                          size="sm"
                          onClick={() => removeDraftUrl(m.imageUrl)}
                          disabled={busy === "upload" || deletingUrl === m.imageUrl}
                          aria-label="Remove image"
                          title="Remove image"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                Drag & drop screenshots above (or click to upload).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
