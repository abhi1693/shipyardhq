import { auth } from "@clerk/nextjs/server"
import { putBlob } from "@/lib/blob"

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
      ? `user_${userId}/products/${productId}/${folder}`
      : `user_${userId}/${folder}`
    const key = `${prefix}/${Date.now()}-${sanitizeFilename(file.name || "image")}`
    const arrayBuf = await file.arrayBuffer()
    const uploaded = await putBlob(key, arrayBuf, {
      access: "public",
      contentType: file.type,
    })
    return Response.json({ url: uploaded.url })
  } catch (err: any) {
    console.error("Generic upload error:", err)
    return new Response(err?.message || "Upload failed", { status: 500 })
  }
}
