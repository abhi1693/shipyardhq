import MemberFeedback from "@/components/pages/MemberFeedback"
import { listMyFeedback } from "@/actions/member/feedback/actions"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Feedback",
  description: "Share feedback with the Shipyard crew.",
})

export default async function MemberFeedbackPage() {
  const entries = await listMyFeedback(25)

  return <MemberFeedback entries={entries} />
}
