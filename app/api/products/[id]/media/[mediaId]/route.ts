import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { deleteBlob } from "@/lib/blob"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  try {
    const { id, mediaId } = await params
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const user = await getActiveUserByClerkId(userId)
    if (!user) return new Response("Account inactive", { status: 403 })

    const media = await prisma.productMedia.findUnique({
      where: { id: mediaId },
      include: { product: { select: { id: true, userId: true } } },
    })
    if (!media || media.product.id !== id)
      return new Response("Not Found", { status: 404 })
    if (media.product.userId !== user.id)
      return new Response("Forbidden", { status: 403 })

    // Best-effort delete from Blob; ignore failure
    try {
      await deleteBlob(media.imageUrl)
    } catch (e) {
      console.warn("Blob delete failed (continuing):", e)
    }

    await prisma.productMedia.delete({ where: { id: mediaId } })
    return new Response(null, { status: 204 })
  } catch (err: any) {
    console.error("Delete media error:", err)
    return new Response("Failed to delete media", { status: 500 })
  }
}
