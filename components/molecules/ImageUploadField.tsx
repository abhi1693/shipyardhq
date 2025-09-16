"use client"

import { useState } from "react"
import Image from "next/image"
import DeleteButton from "@/components/molecules/DeleteButton"
import { ExternalLink } from "lucide-react"
// Server-side uses Sharp to convert/compress; client pre-processing disabled.
import { useFormContext } from "react-hook-form"

type Props = {
  name: string
  label: string
  placeholder?: string
  folder?: string
  maxSizeMB?: number
  productId?: string
}

export default function ImageUploadField({
  name,
  label,
  placeholder = "Select an image or drag & drop",
  folder = "assets",
  maxSizeMB = 5,
  productId,
}: Props) {
  const { setValue, watch } = useFormContext()
  const value = (watch(name) as string) || ""
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", folder)
      if (productId) fd.append("productId", productId)
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setValue(name, data.url, { shouldDirty: true, shouldValidate: true })
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    if (uploading) return
    handleFiles(e.dataTransfer.files)
  }
  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {value ? (
        <div className="relative h-40 rounded border overflow-hidden bg-white">
          <Image src={value} alt="" fill className="object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded bg-secondary px-2 py-1 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <DeleteButton
              size="sm"
              label="Remove"
              onClick={async () => {
                if (!value) {
                  setValue(name, "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  return
                }
                setDeleting(true)
                setError(null)
                try {
                  const res = await fetch(
                    `/api/uploads?url=${encodeURIComponent(value)}`,
                    {
                      method: "DELETE",
                    },
                  )
                  if (!res?.ok && res?.status !== 204) {
                    // Non-blocking: still clear the field
                    console.warn("Failed to delete blob for", value)
                  }
                } catch (e: any) {
                  console.warn("Delete request failed", e)
                } finally {
                  setDeleting(false)
                  setValue(name, "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              }}
              disabled={uploading || deleting}
            />
          </div>
        </div>
      ) : (
        <label
          className="flex h-40 items-center justify-center rounded border-2 border-dashed text-center text-sm p-4 hover:bg-muted/40 cursor-pointer"
          onDrop={onDrop}
          onDragOver={onDragOver}
          aria-busy={uploading}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Uploading…
            </div>
          ) : deleting ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Removing…
            </div>
          ) : (
            <div>
              <div className="font-medium mb-1">{placeholder}</div>
              <div className="text-xs text-muted-foreground">
                Max {maxSizeMB}MB
              </div>
            </div>
          )}
        </label>
      )}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  )
}
