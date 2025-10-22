import MemberRewards from "@/components/pages/MemberRewards"
import { getMemberRewardsSnapshot } from "@/actions/member/rewards/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { CardSkeleton } from "@/components/atoms/card.skeleton"

export async function MemberRewardsPageContent() {
  const snapshot = await getMemberRewardsSnapshot()
  return <MemberRewards snapshot={snapshot} />
}

export function MemberRewardsPageSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={4}
        showFooter
        className="border-slate-200/80 bg-white/95 shadow-sm"
      />

      <div className="space-y-4">
        <CardSkeleton
          tone="soft"
          radius="lg"
          lines={3}
          className="border-slate-200/80 bg-white/95 shadow-sm"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative only
              key={index}
              tone="soft"
              radius="lg"
              lines={3}
              showFooter
              className="border-slate-200/70 bg-white"
            />
          ))}
        </div>
        <CardSkeleton
          tone="soft"
          radius="lg"
          lines={4}
          className="border-slate-200/80 bg-white/95 shadow-sm"
        />
      </div>
    </div>
  )
}
