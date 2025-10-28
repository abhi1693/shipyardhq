import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface ProductFeedCardSkeletonProps {
  className?: string
}

export function ProductFeedCardSkeleton({
  className,
}: ProductFeedCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-3xl border border-slate-200/70 bg-white px-5 py-5",
        className,
      )}
      data-testid="homepage-feed-card-skeleton"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-xl border-0 bg-[#EEF0F6]" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-1/2 rounded-full border-0" />
            <Skeleton className="h-4 w-3/4 rounded-full border-0" />
            <Skeleton className="h-4 w-2/3 rounded-full border-0" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-full border border-border/40" />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
        <Skeleton className="h-7 w-28 rounded-full border-0 bg-[#F7F8FF]" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full border-0 bg-[#F1F5FF]" />
          <Skeleton className="h-6 w-24 rounded-full border-0 bg-[#F8F9FB]" />
        </div>
      </div>
    </div>
  )
}

export default ProductFeedCardSkeleton
