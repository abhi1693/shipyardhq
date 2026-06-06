import { cn } from "@/lib/utils"

export function TrafficSidebarStatsSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn("@container", className)}>
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
        {[1, 2].map((key) => (
          <div
            key={key}
            className="min-h-[150px] rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="h-3 w-20 animate-pulse rounded bg-muted" />
              <span className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-14 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-11 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
        <div className="min-h-[88px] rounded-xl bg-black p-4 shadow-sm @[20rem]:col-span-2">
          <div className="flex items-center gap-3">
            <span className="size-10 animate-pulse rounded-lg bg-white/10" />
            <div className="space-y-2">
              <span className="block h-3 w-32 animate-pulse rounded bg-white/20" />
              <span className="block h-4 w-24 animate-pulse rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-3 h-3 w-36 animate-pulse rounded bg-muted" />
    </div>
  )
}
