"use client"

import { useState } from "react"
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
        <div className="relative rounded border overflow-hidden">
          <img
            src={value}
            alt=""
            className="w-full h-40 object-contain bg-white"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded bg-secondary px-2 py-1 text-xs"
            >
              Open
            </a>
            <button
              type="button"
              className="inline-flex items-center rounded bg-destructive text-destructive-foreground px-2 py-1 text-xs"
              onClick={() =>
                setValue(name, "", { shouldDirty: true, shouldValidate: true })
              }
              disabled={uploading}
            >
              Remove
            </button>
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
