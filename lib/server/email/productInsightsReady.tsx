import ProductInsightInsightsReadyEmail from "@/lib/email/templates/product/productInsightsReady"
import { sendEmail } from "@/lib/email/resend"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberProductInsightsPath } from "@/lib/routes"
import type {
  ProductInsightProfilePayload,
  ProductInsightStageView,
} from "@/types/product-insights"

const INSIGHTS_READY_SUBJECTS = [
  "Updated Insights Inside: Your Shipyard Performance Snapshot",
  "Quick Wins Await: Shipyard Insights Refreshed for This Week",
  "New Data Drop: See What's Changed in Your Shipyard Dashboard",
  "Ready for a Boost? Unlock the Latest Shipyard Trends",
  "Your Shipyard Insights Are In - See the Highlights Now",
  "Fresh Shipyard Metrics: What's Moving the Needle Today",
  "Weekly Shipyard Pulse: Insights You Can Act on Now",
  "Unlock New Opportunities: Shipyard Insights Waiting for You",
  "Chart Your Course: Latest Shipyard Performance Signals",
  "Shipyard Trends Update: Spot the Signals Before They Fade",
  "Don't Miss This Wave: Your Updated Shipyard Analytics",
  "Dive Into the Data: Shipyard Metrics Just Landed",
  "Navigate Smarter: Fresh Shipyard Performance Highlights",
  "Shipyard Snapshot: See What's Driving Results Right Now",
  "New Insights Alert: Your Shipyard Dashboard Just Got Smarter",
  "Ready to Act? Shipyard Metrics Point to What's Next",
  "Performance Update: Shipyard Insights That Matter This Week",
  "Momentum Check: Shipyard Data Highlights You Should Know",
  "Fresh Off the Press: Shipyard KPIs You Can't Ignore",
  "Activate Your Edge: New Shipyard Trends Revealed",
  "Shipyard Intelligence Brief: Key Changes You Need to See",
  "Gain the Advantage: Updated Shipyard Insights Await",
  "Current Status: Shipyard Metrics That Demand Attention",
  "Get Ahead: Shipyard Dashboards Just Refreshed for You",
  "Your Weekly Shipyard Debrief: Metrics Worth a Look",
  "Charts Up: Shipyard Insight Signals Trending Right Now",
  "Time to Review: Shipyard Data Points Shaping Outcomes",
  "Unlock the Signal: Shipyard Performance Update Inside",
  "Recalibrate Today: Shipyard Insights with Immediate Impact",
  "Strategic Update: Shipyard Trends to Guide Your Next Move",
] as const

function pickInsightsReadySubject() {
  const index = Math.floor(Math.random() * INSIGHTS_READY_SUBJECTS.length)
  return INSIGHTS_READY_SUBJECTS[index]
}

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
    subject: pickInsightsReadySubject(),
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
