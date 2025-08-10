import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { putBlob } from "@/lib/blob"

export const dynamic = "force-dynamic"

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    })
    if (!user) return new Response("Unauthorized", { status: 401 })

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })
    if (!product) return new Response("Not Found", { status: 404 })
    if (product.userId !== user.id)
      return new Response("Forbidden", { status: 403 })

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
    const remaining = Math.max(0, 4 - existingCount)
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
        const key = `${userId}/products/${product.id}/media/${Date.now()}-${sanitizeFilename(
          file.name || "image",
        )}`
        const arrayBuf = await file.arrayBuffer()
        return await putBlob(key, arrayBuf, {
          access: "public",
          contentType: file.type,
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
