import { Skeleton } from "@/components/atoms/skeleton"

export function MemberAccountProfileSkeleton() {
  return (
    <div
      className="w-full max-w-[1000px] space-y-8"
      data-slot="member-account-profile-skeleton"
      aria-hidden="true"
    >
      <header className="space-y-2">
        <Skeleton className="h-7 w-56 rounded-full" tone="soft" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full" tone="muted" />
      </header>

      <div className="space-y-6">
        <ProfileCardSkeleton />
        <ListCardSkeleton rows={2} />
        <ListCardSkeleton rows={1} />
      </div>
    </div>
  )
}

function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-5 w-36 rounded-full" tone="soft" />
      </div>
      <div className="flex items-center gap-6 p-6">
        <Skeleton className="h-20 w-20 rounded-full" tone="muted" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-56 max-w-full rounded-full" />
          <Skeleton className="h-4 w-72 max-w-full rounded-full" tone="muted" />
          <Skeleton className="h-4 w-64 max-w-full rounded-full" tone="muted" />
        </div>
      </div>
    </div>
  )
}

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-5 w-44 rounded-full" tone="soft" />
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-6">
            <Skeleton className="h-10 w-10 rounded-lg" tone="muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-64 max-w-full rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
