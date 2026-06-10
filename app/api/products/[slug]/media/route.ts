import type { NextRequest } from "next/server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { putBlob } from "@/lib/blob"
import { toWebpIfPossible } from "@/lib/server/image"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ slug: string }>
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await getActiveUserByClerkId(userId)
    if (!user) return new Response("Account inactive", { status: 403 })
    const isAdmin = user.role === "admin"

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, userId: true, user: { select: { clerkId: true } } },
    })
    if (!product) return new Response("Not Found", { status: 404 })
    if (!isAdmin && product.userId !== user.id)
      return new Response("Forbidden", { status: 403 })
    const ownerClerkId =
      typeof product.user?.clerkId === "string" && product.user.clerkId.length
        ? product.user.clerkId
        : userId

    const form = await req.formData()
    const altText = (form.get("altText") as string | null) || undefined
    const filesA = form
      .getAll("file")
      .filter((f) => f instanceof File) as File[]
    const filesB = form
      .getAll("files")
      .filter((f) => f instanceof File) as File[]
    const files = (filesA.length ? filesA : filesB).filter(Boolean)

    if (!files.length) {
      return Response.json({ error: "Missing file(s)" }, { status: 400 })
    }

    const existingCount = await prisma.productMedia.count({
      where: { productId: product.id },
    })
    const remaining = Math.max(0, 6 - existingCount)
    if (files.length > remaining) {
      return Response.json(
        {
          error: `Too many files. You can upload ${remaining} more.`,
          remaining,
        },
        { status: 400 },
      )
    }

    const maxBytes = 5 * 1024 * 1024 // 5MB
    for (const file of files) {
      if (!file.type?.startsWith("image/"))
        return Response.json({ error: "Only images allowed" }, { status: 415 })
      if (file.size > maxBytes)
        return Response.json(
          { error: "File too large (max 5MB)" },
          { status: 413 },
        )
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const arrayBuf = await file.arrayBuffer()
        const processed = await toWebpIfPossible(arrayBuf, file.type)
        const base = sanitizeFilename(
          (file.name || "image").replace(/\.[^.]+$/, ""),
        )
        const key = `${ownerClerkId}/products/${product.id}/media/${Date.now()}-${base}.${processed.extension}`
        return await putBlob(key, processed.buffer, {
          access: "public",
          contentType: processed.contentType,
        })
      }),
    )

    const created = await prisma.$transaction(
      uploaded.map((u) =>
        prisma.productMedia.create({
          data: { productId: product.id, imageUrl: u.url, altText },
        }),
      ),
    )

    return Response.json({ media: created })
  } catch (err: any) {
    const message = err?.message || "Upload failed"
    console.error("Upload error:", err)
    return new Response(message, { status: 500 })
  }
}
