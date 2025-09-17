import prisma from "@/lib/prisma"
import { on } from "@/lib/server/events"
import DomainVerificationReminderEmail from "@/lib/email/templates/product/domainVerificationReminder"
import { sendEmail } from "@/lib/email/resend"
import { EMAIL_BRAND } from "@/lib/email/brand"

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.length) return envUrl.replace(/\/$/, "")
  return EMAIL_BRAND.homeUrl.replace(/\/$/, "")
}

function getProductSettingsUrl(slug: string) {
  const base = getBaseUrl()
  return `${base}/member/products/${slug}/edit`
}

on("product.created", async ({ productId }) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        slug: true,
        user: { select: { email: true } },
        verification: {
          select: { verificationTxt: true, isVerified: true },
        },
      },
    })

    if (!product) return
    if (!product.user?.email) return

    const verification = product.verification
    if (!verification) return
    if (verification.isVerified) return

    await sendEmail({
      to: product.user.email,
      subject: `Verify ${product.name} on Shipyard HQ`,
      react: (
        <DomainVerificationReminderEmail
          productName={product.name}
          verificationCode={verification.verificationTxt}
          dashboardUrl={getProductSettingsUrl(product.slug)}
        />
      ),
    })
  } catch (error) {
    console.error("[email] domain verification reminder failed", error)
  }
})
