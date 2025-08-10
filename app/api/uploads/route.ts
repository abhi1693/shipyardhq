import { auth } from "@clerk/nextjs/server"
import { putBlob } from "@/lib/blob"
import { toWebpIfPossible } from "@/lib/server/image"

export const dynamic = "force-dynamic"

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const form = await req.formData()
    const file = form.get("file") as File | null
    const folder = (form.get("folder") as string | null) || "assets"
    const productId = (form.get("productId") as string | null) || undefined
    if (!file) return new Response("Missing file", { status: 400 })
    if (!file.type?.startsWith("image/"))
      return new Response("Only images allowed", { status: 415 })
    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes)
      return new Response("File too large (max 5MB)", { status: 413 })

    const prefix = productId
      ? `${userId}/products/${productId}/${folder}`
      : `${userId}/${folder}`
    const arrayBuf = await file.arrayBuffer()
    const processed = await toWebpIfPossible(arrayBuf, file.type)
    const base = sanitizeFilename(
      (file.name || "image").replace(/\.[^.]+$/, ""),
    )
    const key = `${prefix}/${Date.now()}-${base}.${processed.extension}`
    const uploaded = await putBlob(key, processed.buffer, {
      access: "public",
      contentType: processed.contentType,
    })
    return Response.json({ url: uploaded.url })
  } catch (err: any) {
    console.error("Generic upload error:", err)
    return new Response(err?.message || "Upload failed", { status: 500 })
  }
}
