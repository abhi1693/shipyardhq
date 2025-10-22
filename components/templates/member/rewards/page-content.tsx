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
import { Skeleton } from "@/components/atoms/skeleton"

export async function MemberRewardsPageContent() {
  const snapshot = await getMemberRewardsSnapshot()
  return <MemberRewards snapshot={snapshot} />
}

export function MemberRewardsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr,1fr,1fr]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t border-slate-200/70 px-6 py-4">
          <Skeleton className="h-3 w-64 rounded-md" />
        </CardFooter>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="border-slate-200/70 bg-white p-4">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-56 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-48 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-32 rounded-full" />
                </CardFooter>
              </Card>
            ))}
          </div>

          <Skeleton className="h-5 w-44 rounded-md" />
          <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white">
            <div className="hidden grid-cols-[1fr,1fr,1fr,1fr] gap-4 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-full rounded-md" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr,1fr,1fr,1fr]"
              >
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
