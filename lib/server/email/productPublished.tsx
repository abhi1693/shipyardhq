import prisma from "@/lib/prisma"
import { memberProductPath, productPath } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sendProductNotificationToNovu } from "@/lib/server/notifications/novuProduct"

const PRODUCT_PUBLISHED_SUBJECT = "Your product is live on ShipYardHQ"
const PRODUCT_PUBLISHED_MESSAGE =
  "Your product is live—review your dashboard and keep the momentum going."

export async function sendProductPublishedEmail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      slug: true,
      status: true,
      publishedAt: true,
      plan: { select: { name: true } },
      user: {
        select: {
          email: true,
          clerkId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!product) return
  if (product.status !== "published") return
  if (!product.slug) return

  const subscriberId = product.user?.clerkId?.trim()
  if (!subscriberId) {
    console.warn(
      "[novu] skip product.published notification; missing clerkId",
      {
        productId,
      },
    )
    return
  }

  const siteUrl = resolveSiteUrl()
  const baseUrl = `${siteUrl}/`

  const recipient = {
    subscriberId,
    email: product.user?.email ?? undefined,
    firstName: product.user?.firstName ?? undefined,
    lastName: product.user?.lastName ?? undefined,
  }

  const productLinks = {
    member: new URL(memberProductPath(product.slug), baseUrl).toString(),
    public: new URL(productPath(product.slug), baseUrl).toString(),
  }

  const context = {
    product_published: {
      publishedAt:
        product.publishedAt?.toISOString() ?? new Date().toISOString(),
    },
  }

  await sendProductNotificationToNovu({
    kind: "product_published",
    message:
      product.name && product.name.length > 0
        ? `${product.name} just launched—share your public page and track momentum.`
        : PRODUCT_PUBLISHED_MESSAGE,
    subject:
      product.name && product.name.length > 0
        ? `${product.name} is live on ShipYardHQ`
        : PRODUCT_PUBLISHED_SUBJECT,
    recipient,
    product: {
      id: productId,
      slug: product.slug,
      name: product.name,
    },
    links: productLinks,
    context,
    tags: ["product-notifications", "product-published"],
  })
}
