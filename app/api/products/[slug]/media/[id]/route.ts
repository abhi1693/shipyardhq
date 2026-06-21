import type { NextRequest } from "next/server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { deleteBlob, isManagedBlobUrl } from "@/lib/blob"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

type RouteContext = {
  params: Promise<{ slug: string; id: string }>
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { slug, id } = await params
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await getActiveUserByClerkId(userId)
    if (!user) return new Response("Account inactive", { status: 403 })

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, userId: true, user: { select: { clerkId: true } } },
    })
    if (!product) return new Response("Not Found", { status: 404 })
    if (product.userId !== user.id)
      return new Response("Forbidden", { status: 403 })
    const ownerClerkId =
      typeof product.user?.clerkId === "string" && product.user.clerkId.length
        ? product.user.clerkId
        : userId

    const media = await prisma.productMedia.findUnique({
      where: { id },
      select: { id: true, productId: true, imageUrl: true },
    })
    if (!media || media.productId !== product.id)
      return new Response("Not Found", { status: 404 })

    await prisma.productMedia.delete({ where: { id: media.id } })

    // Best-effort blob cleanup; ignore failures so UI stays responsive.
    try {
      const url = new URL(media.imageUrl)
      const expectedPrefix = `${ownerClerkId}/products/${product.id}/media/`
      if (
        isManagedBlobUrl(media.imageUrl) &&
        url.pathname.slice(1).startsWith(expectedPrefix)
      ) {
        await deleteBlob(media.imageUrl)
      }
    } catch (err) {
      console.warn("Blob delete failed (continuing):", err)
    }

    return new Response(null, { status: 204 })
  } catch (err: any) {
    console.error("Delete media error:", err)
    return new Response(err?.message || "Delete failed", { status: 500 })
  }
}
