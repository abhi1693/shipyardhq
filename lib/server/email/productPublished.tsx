import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import ProductPublishedEmail from "@/lib/email/templates/product/productPublished"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductPath } from "@/lib/routes"

function getProductUrl(slug: string) {
  const base = getAppBaseUrl()
  return `${base}/products/${slug}`
}

function getDashboardUrl(slug: string) {
  const base = getAppBaseUrl()
  return `${base}${memberProductPath(slug)}`
}

export async function sendProductPublishedEmail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      slug: true,
      status: true,
      publishedAt: true,
      plan: { select: { name: true } },
      user: { select: { email: true } },
    },
  })

  if (!product) return
  if (product.status !== "published") return
  if (!product.user?.email) return

  await sendEmail({
    to: product.user.email,
    subject: `${product.name} is live on Shipyard HQ`,
    react: (
      <ProductPublishedEmail
        productName={product.name}
        productUrl={getProductUrl(product.slug)}
        dashboardUrl={getDashboardUrl(product.slug)}
        productSlug={product.slug}
        publishedAt={product.publishedAt ?? undefined}
        planName={product.plan?.name ?? undefined}
      />
    ),
  })
}
