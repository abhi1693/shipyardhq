import ProductInsightInsightsReadyEmail from "@/lib/email/templates/product/productInsightsReady"
import { sendEmail } from "@/lib/email/resend"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductInsightsPath } from "@/lib/routes"
import type {
  ProductInsightProfilePayload,
  ProductInsightStageView,
} from "@/types/product-insights"

type SendProductInsightInsightsReadyEmailOptions = {
  productId: string
  productSlug: string
  productName: string
  recipientEmail: string
  profile: ProductInsightProfilePayload
}

export async function sendProductInsightInsightsReadyEmail({
  productId,
  productSlug,
  productName,
  recipientEmail,
  profile,
}: SendProductInsightInsightsReadyEmailOptions) {
  if (!recipientEmail) {
    throw new Error("Cannot send pipeline email without a recipient")
  }

  const reportStage = profile.stages?.["report.comprehensive"] as
    | ProductInsightStageView<"report.comprehensive">
    | undefined

  if (!reportStage?.data?.report) {
    throw new Error("Cannot send pipeline email without a final report stage")
  }

  const baseUrl = getAppBaseUrl()
  const insightsUrl = `${baseUrl}${memberProductInsightsPath(productSlug)}`

  await sendEmail({
    to: recipientEmail,
    subject: `Insights updated for ${productName}`,
    react: (
      <ProductInsightInsightsReadyEmail
        productName={productName}
        insightsUrl={insightsUrl}
      />
    ),
  })

  console.info("[productInsights:email] insights pipeline email sent", {
    productId,
    productSlug,
    recipientEmail,
  })
}
