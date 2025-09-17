"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import DeleteButton from "@/components/molecules/DeleteButton"
import { useRouter } from "next/navigation"
// Server-side uses Sharp to convert/compress; client pre-processing disabled.

type Media = { id: string; imageUrl: string }

type Props = {
  productId: string
  media: Media[]
  canEdit?: boolean
  max?: number
}

export default function ProductMediaManager({
  productId,
  media,
  canEdit = false,
  max = 3,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | "upload">(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const remaining = Math.max(0, max - media.length)
  const isUploading = busy === "upload"
  const uploadingText = "Uploading…"

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || !canEdit || remaining === 0) return
      setBusy("upload")
      setError(null)
      try {
        const fd = new FormData()
        const selected = Array.from(files).slice(0, remaining)
        for (const f of selected) {
          fd.append("file", f)
        }
        const res = await fetch(`/api/products/${productId}/media`, {
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
    },
    [productId, remaining, canEdit, router],
  )

  async function onRemove(id: string) {
    if (!canEdit) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/products/${productId}/media/${id}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Failed to remove")
    } finally {
      setDeletingId(null)
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    if (!e.dataTransfer.files?.length) return
    uploadFiles(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
  }

  return (
    <div className="space-y-2">
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <div className="relative">
        {isUploading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              {uploadingText}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {canEdit && remaining > 0 ? (
            <label
              className="flex aspect-video cursor-pointer items-center justify-center rounded border-2 border-dashed text-center text-sm p-4 hover:bg-muted/40"
              onDrop={onDrop}
              onDragOver={onDragOver}
              aria-busy={isUploading}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  {uploadingText}
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-1">Drag & drop images</div>
                  <div className="text-xs text-muted-foreground">
                    {max - remaining} of {max} uploaded. Add up to {remaining}{" "}
                    more.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Max 5MB per image.
                  </div>
                </div>
              )}
            </label>
          ) : null}

          {media.map((m) => (
            <div
              key={m.id}
              className="relative overflow-hidden rounded border bg-background aspect-video"
            >
              <Image
                src={m.imageUrl}
                alt=""
                fill
                className="object-cover"
                quality={95}
              />
              {deletingId === m.id ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Deleting…
                  </div>
                </div>
              ) : null}
              {canEdit ? (
                <div className="absolute top-2 right-2">
                  <DeleteButton
                    size="sm"
                    onClick={() => onRemove(m.id)}
                    disabled={deletingId === m.id || isUploading}
                    aria-label="Remove image"
                    title="Remove image"
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
