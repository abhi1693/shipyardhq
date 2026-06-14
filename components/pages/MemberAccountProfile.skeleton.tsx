import { Skeleton } from "@/components/atoms/skeleton"

export function MemberAccountProfileSkeleton() {
  return (
    <div
      className="w-full max-w-[1000px] space-y-8"
      data-slot="member-account-profile-skeleton"
      aria-hidden="true"
    >
      <header>
        <Skeleton className="h-8 w-60 rounded-lg" tone="soft" />
        <Skeleton
          className="mt-2 h-4 w-[30rem] max-w-full rounded-full"
          tone="muted"
        />
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          <ProfileCardSkeleton />
          <EmailCardSkeleton />
          <ConnectedAccountsSkeleton />
          <DangerCardSkeleton />
        </div>
      </div>
    </div>
  )
}

function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-6 w-36 rounded-full" tone="soft" />
        <Skeleton className="h-9 w-32 rounded-lg" tone="muted" />
      </div>
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Skeleton className="h-20 w-20 rounded-full" tone="muted" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-52 max-w-full rounded-full" />
            <Skeleton className="h-5 w-20 rounded" tone="soft" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full rounded-full" tone="muted" />
          <Skeleton className="h-4 w-36 rounded-full" tone="muted" />
        </div>
      </div>
    </div>
  )
}

function EmailCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-6 w-40 rounded-full" tone="soft" />
        <Skeleton className="h-9 w-40 rounded-lg" tone="muted" />
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 items-center gap-4">
              <Skeleton className="h-5 w-5 rounded" tone="muted" />
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Skeleton className="h-4 w-56 max-w-full rounded-full" />
                <Skeleton className="h-5 w-20 rounded" tone="soft" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Skeleton className="h-9 w-28 rounded-lg" tone="muted" />
              <Skeleton className="h-9 w-24 rounded-lg" tone="muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectedAccountsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-6 w-44 rounded-full" tone="soft" />
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" tone="muted" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded" tone="soft" />
              </div>
              <Skeleton className="h-4 w-48 rounded-full" tone="muted" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" tone="muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-lg" tone="muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

function DangerCardSkeleton() {
  return (
    <div className="rounded-xl border border-red-100 bg-white shadow-sm">
      <div className="border-b border-red-100 px-6 py-4">
        <Skeleton className="h-6 w-36 rounded-full bg-red-100/80" tone="soft" />
      </div>
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-2">
          <Skeleton className="h-4 w-72 max-w-full rounded-full" />
          <Skeleton className="h-4 w-96 max-w-full rounded-full" tone="muted" />
          <Skeleton className="h-4 w-80 max-w-full rounded-full" tone="muted" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg bg-red-100/80" tone="soft" />
      </div>
    </div>
  )
}
