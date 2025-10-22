import MemberFeedback from "@/components/pages/MemberFeedback"
import { listMyFeedback } from "@/actions/member/feedback/actions"
import { Skeleton } from "@/components/atoms/skeleton"

export async function MemberFeedbackPageContent() {
  const entries = await listMyFeedback(25)
  return <MemberFeedback entries={entries} />
}

export function MemberFeedbackPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
      <Skeleton className="h-[320px] rounded-3xl" />
      <Skeleton className="h-[480px] rounded-3xl" />
    </div>
  )
}
