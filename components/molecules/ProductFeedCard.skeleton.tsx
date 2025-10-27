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
        "overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-5 py-5 shadow-[0_22px_64px_-50px_rgba(7,58,104,0.42)]",
        className,
      )}
      data-testid="homepage-feed-card-skeleton"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 rounded-2xl border-0 bg-[#EEF0F6]" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2 rounded-full border-0" />
              <Skeleton className="h-4 w-3/4 rounded-full border-0" />
              <Skeleton className="h-4 w-1/2 rounded-full border-0" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full border-0 bg-[#EEF0F6]" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-full border-0 bg-[#F1F5FF]" />
            <Skeleton className="h-6 w-24 rounded-full border-0 bg-[#F8F9FB]" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-7 w-28 rounded-full border-0 bg-[#F7F8FF]" />
        <Skeleton className="h-7 w-36 rounded-full border-0 bg-[#F8F9FB]" />
      </div>
    </div>
  )
}

export default ProductFeedCardSkeleton
