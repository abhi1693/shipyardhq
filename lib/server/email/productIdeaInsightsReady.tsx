import ProductIdeaInsightsReadyEmail from "@/lib/email/templates/product/productIdeaInsightsReady"
import { sendEmail } from "@/lib/email/resend"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductIdeasPath } from "@/lib/routes"
import type { SerializedIdeaProfile } from "@/types/product-ideas"

type SendProductIdeaInsightsReadyEmailOptions = {
  productId: string
  productSlug: string
  productName: string
  recipientEmail: string
  profile: SerializedIdeaProfile
}

function truncate(value: string | null | undefined, max = 420) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`
}

export async function sendProductIdeaInsightsReadyEmail({
  productId,
  productSlug,
  productName,
  recipientEmail,
  profile,
}: SendProductIdeaInsightsReadyEmailOptions) {
  if (!recipientEmail) {
    throw new Error("Cannot send pipeline email without a recipient")
  }

  const finalReport = profile.finalReport
  if (!finalReport) {
    throw new Error("Cannot send pipeline email without a final report")
  }

  const baseUrl = getAppBaseUrl()
  const insightsUrl = `${baseUrl}${memberProductIdeasPath(productSlug)}`

  const highlightCount = finalReport.headlineHighlights?.length ?? 0
  const highlightPoints = (finalReport.headlineHighlights ?? []).slice(0, 3)
  const summarySnippet =
    truncate(finalReport.executiveSummary, 540) ??
    truncate(profile.summary?.overview, 540)

  await sendEmail({
    to: recipientEmail,
    subject: `Insights updated for ${productName}`,
    react: (
      <ProductIdeaInsightsReadyEmail
        productName={productName}
        insightsUrl={insightsUrl}
        highlightCount={highlightCount}
        communityCount={profile.subreddits?.length ?? 0}
        threadCount={profile.redditDiscussions?.length ?? 0}
        highlightPoints={highlightPoints}
        summary={summarySnippet}
      />
    ),
  })

  console.info("[productIdeas:email] insights pipeline email sent", {
    productId,
    productSlug,
    recipientEmail,
  })
}

