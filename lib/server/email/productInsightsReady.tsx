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

function truncate(value: string | null | undefined, max = 420) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`
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

  const snapshotStage = profile.stages?.["product.snapshot"] as
    | ProductInsightStageView<"product.snapshot">
    | undefined
  const communityStage = profile.stages?.["reddit.communities"] as
    | ProductInsightStageView<"reddit.communities">
    | undefined
  const discussionStage = profile.stages?.["reddit.discussions"] as
    | ProductInsightStageView<"reddit.discussions">
    | undefined
  const reportStage = profile.stages?.["report.comprehensive"] as
    | ProductInsightStageView<"report.comprehensive">
    | undefined

  const finalReport = reportStage?.data?.report ?? null
  if (!finalReport) {
    throw new Error("Cannot send pipeline email without a final report stage")
  }

  const baseUrl = getAppBaseUrl()
  const insightsUrl = `${baseUrl}${memberProductInsightsPath(productSlug)}`

  const highlightCount = finalReport.headlineHighlights?.length ?? 0
  const highlightPoints = (finalReport.headlineHighlights ?? []).slice(0, 3)
  const summarySnippet =
    truncate(finalReport.executiveSummary, 540) ??
    truncate(snapshotStage?.data?.summary?.overview ?? null, 540)

  const communityCount = communityStage?.data?.subreddits?.length ?? 0
  const threadCount = discussionStage?.data?.threads?.length ?? 0

  await sendEmail({
    to: recipientEmail,
    subject: `Insights updated for ${productName}`,
    react: (
      <ProductInsightInsightsReadyEmail
        productName={productName}
        insightsUrl={insightsUrl}
        highlightCount={highlightCount}
        communityCount={communityCount}
        threadCount={threadCount}
        highlightPoints={highlightPoints}
        summary={summarySnippet}
      />
    ),
  })

  console.info("[productInsights:email] insights pipeline email sent", {
    productId,
    productSlug,
    recipientEmail,
  })
}
