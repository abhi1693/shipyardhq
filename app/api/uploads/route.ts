import { auth } from "@clerk/nextjs/server"
import { putBlob, deleteBlob, isManagedBlobUrl } from "@/lib/blob"
import { toWebpIfPossible } from "@/lib/server/image"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export const dynamic = "force-dynamic"

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await getActiveUserByClerkId(userId)
    if (!user) return new Response("Account inactive", { status: 403 })

    const form = await req.formData()
    const file = form.get("file") as File | null
    const folder = (form.get("folder") as string | null) || "assets"
    const productId = (form.get("productId") as string | null) || undefined
    const scopeValue = (form.get("scope") as string | null) || "user"
    const asClerkId = (form.get("asClerkId") as string | null) || undefined
    const scope = scopeValue === "global" ? "global" : "user"
    if (!file) return new Response("Missing file", { status: 400 })
    if (!file.type?.startsWith("image/"))
      return new Response("Only images allowed", { status: 415 })
    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes)
      return new Response("File too large (max 5MB)", { status: 413 })

    const trimmedFolder = folder.replace(/^\/+|\/+$/g, "") || "assets"
    if (scope === "global" && user.role !== "admin") {
      return new Response("Forbidden", { status: 403 })
    }
    if (asClerkId && user.role !== "admin") {
      return new Response("Forbidden", { status: 403 })
    }

    const effectiveClerkId =
      asClerkId && user.role === "admin" ? asClerkId : userId
    const prefix =
      scope === "global"
        ? `global/${trimmedFolder}`
        : productId
          ? `${effectiveClerkId}/products/${productId}/${trimmedFolder}`
          : `${effectiveClerkId}/${trimmedFolder}`
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

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await getActiveUserByClerkId(userId)
    if (!user) return new Response("Account inactive", { status: 403 })
    const isAdmin = user.role === "admin"

    // Support url via JSON body or query param
    let url: string | undefined
    let asClerkId: string | undefined
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as any
      url = typeof body?.url === "string" ? body.url : undefined
      asClerkId =
        typeof body?.asClerkId === "string" ? body.asClerkId : undefined
    }
    if (!url) {
      const u = new URL(req.url)
      url = u.searchParams.get("url") ?? undefined
      asClerkId = u.searchParams.get("asClerkId") ?? undefined
    }
    if (!url) return new Response("Missing url", { status: 400 })
    if (asClerkId && !isAdmin) {
      return new Response("Forbidden", { status: 403 })
    }

    // Only allow deleting blobs under the current user's prefix on managed R2.
    try {
      const u = new URL(url)
      const pathname = u.pathname
      const globalScoped = pathname.startsWith("/global/")
      const allowedUserPrefixes = new Set<string>([userId])
      if (isAdmin && asClerkId) allowedUserPrefixes.add(asClerkId)
      const userScoped = Array.from(allowedUserPrefixes).some((prefix) =>
        pathname.startsWith(`/${prefix}/`),
      )
      if (!isManagedBlobUrl(url)) {
        return new Response("Forbidden", { status: 403 })
      }
      if (globalScoped) {
        if (!isAdmin) {
          return new Response("Forbidden", { status: 403 })
        }
      } else if (!userScoped) {
        return new Response("Forbidden", { status: 403 })
      }
    } catch {
      return new Response("Invalid url", { status: 400 })
    }

    try {
      await deleteBlob(url)
    } catch (e) {
      // Best-effort; return 204 even if delete fails to avoid blocking UX
      console.warn("Blob delete failed (continuing):", e)
    }
    return new Response(null, { status: 204 })
  } catch (err: any) {
    console.error("Generic delete upload error:", err)
    return new Response(err?.message || "Delete failed", { status: 500 })
  }
}
