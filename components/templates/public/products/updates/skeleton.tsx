import { Skeleton } from "@/components/atoms/skeleton"

export function ProductUpdatesArchiveSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
