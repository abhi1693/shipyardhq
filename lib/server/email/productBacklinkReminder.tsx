import { sendEmail } from "@/lib/email/resend"
import ProductBacklinkReminderEmail from "@/lib/email/templates/product/productBacklinkReminder"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductEditPath } from "@/lib/routes"

type BacklinkReminderContext = {
  ownerEmail: string
  ownerFirstName?: string | null
  ownerLastName?: string | null
  productName: string
  productSlug: string
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) return "there"
  return parts.join(" ")
}

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export async function sendBacklinkReminderEmail({
  ownerEmail,
  ownerFirstName,
  ownerLastName,
  productName,
  productSlug,
}: BacklinkReminderContext): Promise<void> {
  const ownerName = formatName(ownerFirstName, ownerLastName)
  const dashboardUrl = buildAbsoluteUrl(memberProductEditPath(productSlug))

  const subject = `${productName} can unlock rewards with a Shipyard backlink`

  await sendEmail({
    to: ownerEmail,
    subject,
    react: (
      <ProductBacklinkReminderEmail
        ownerName={ownerName}
        productName={productName}
        dashboardUrl={dashboardUrl}
      />
    ),
  })
}
