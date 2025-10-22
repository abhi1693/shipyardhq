import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { cn } from "@/lib/utils"

interface AdminAccountProfileSkeletonProps
  extends React.ComponentProps<"div"> {}

export function AdminAccountProfileSkeleton({
  className,
  ...props
}: AdminAccountProfileSkeletonProps) {
  return (
    <div
      className={cn("p-4 sm:p-6", className)}
      data-slot="admin-account-profile-skeleton"
      aria-hidden="true"
      {...props}
    >
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        inset
        className="mx-auto w-full max-w-3xl space-y-6 border border-white/25 p-4 sm:p-6"
      >
        <HeadingSkeleton lines={1} />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-9 rounded-lg"
              tone="soft"
            />
          ))}
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </Skeleton>
    </div>
  )
}
