import { cn } from "@/lib/utils"

import { Skeleton, type SkeletonProps } from "./skeleton"

interface AvatarSkeletonProps extends Omit<SkeletonProps, "children"> {
  size?: number
  badge?: boolean
}

export function AvatarSkeleton({
  className,
  size = 48,
  badge = false,
  radius = "full",
  ...props
}: AvatarSkeletonProps) {
  const dimension =
    typeof size === "number" && Number.isFinite(size) ? `${size}px` : size

  return (
    <div className={cn("relative inline-flex", className)}>
      <Skeleton
        data-slot="avatar-skeleton"
        radius={radius}
        tone="soft"
        className="size-full"
        style={{ width: dimension, height: dimension }}
        {...props}
      />
      {badge && (
        <Skeleton
          data-slot="avatar-skeleton-badge"
          tone="brand"
          radius="full"
          className="absolute bottom-0 right-0 size-3 border-2 border-white dark:border-slate-950"
        />
      )}
    </div>
  )
}
