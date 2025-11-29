import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import PaymentSyncErrorEmail from "@/lib/email/templates/product/paymentSyncError"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductEditPath } from "@/lib/routes"

type SendPaymentConnectorSyncErrorEmailOptions = {
  productId: string
  errorMessage?: string | null
}

export async function sendPaymentConnectorSyncErrorEmail({
  productId,
  errorMessage,
}: SendPaymentConnectorSyncErrorEmailOptions) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      slug: true,
      user: { select: { email: true, firstName: true } },
    },
  })

  if (!product?.slug) return
  if (!product.user?.email) return

  const baseUrl = getAppBaseUrl()
  const editUrl = `${baseUrl}${memberProductEditPath(product.slug)}`

  await sendEmail({
    to: product.user.email,
    subject: `Action needed: fix ${product.name} revenue sync`,
    react: (
      <PaymentSyncErrorEmail
        ownerName={product.user.firstName}
        productName={product.name}
        editUrl={editUrl}
        errorMessage={errorMessage}
      />
    ),
  })
}
