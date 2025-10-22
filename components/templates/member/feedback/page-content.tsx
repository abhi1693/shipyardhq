import MemberFeedback from "@/components/pages/MemberFeedback"
import { listMyFeedback } from "@/actions/member/feedback/actions"
import { CardSkeleton } from "@/components/atoms/card.skeleton"

export async function MemberFeedbackPageContent() {
  const entries = await listMyFeedback(25)
  return <MemberFeedback entries={entries} />
}

export function MemberFeedbackPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={4}
        showFooter
        className="border border-slate-200/80 bg-white/95 shadow-sm"
      />
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={6}
        showFooter
        className="border border-slate-200/80 bg-white/95 shadow-sm"
      />
    </div>
  )
}
