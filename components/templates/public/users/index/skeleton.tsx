import { Skeleton } from "@/components/atoms/skeleton"

export function UsersIndexSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <Skeleton className="h-[320px] rounded-3xl" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-10">
              <Skeleton className="h-[320px] rounded-3xl" />
              <Skeleton className="h-[480px] rounded-3xl" />
            </div>
            <aside className="flex flex-col gap-6">
              <Skeleton className="h-[260px] rounded-3xl" />
              <Skeleton className="h-[220px] rounded-3xl" />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
