import { cn } from "@/lib/utils"

export function TrafficSidebarStatsSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {[1, 2].map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-muted animate-pulse" />
            <span className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-3 h-8 w-24 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="mt-3 h-12 w-full rounded bg-muted animate-pulse" />
        </div>
      ))}
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <span className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <span className="h-5 w-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-36 rounded bg-muted animate-pulse" />
    </div>
  )
}
