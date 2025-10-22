import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface DropdownMenuSkeletonProps extends React.ComponentProps<"div"> {
  items?: number
  withSections?: boolean
  isOpen?: boolean
}

export function DropdownMenuSkeleton({
  className,
  items = 4,
  withSections = false,
  isOpen = true,
  ...props
}: DropdownMenuSkeletonProps) {
  const itemCount = Math.max(1, items)
  const sectionSize = withSections ? Math.ceil(itemCount / 2) : itemCount

  return (
    <div
      className={cn("inline-flex flex-col items-start gap-2", className)}
      data-slot="dropdown-menu-skeleton"
      {...props}
    >
      <Skeleton
        className="inline-flex h-9 min-w-[7.5rem] items-center justify-between rounded-md px-3"
        tone="soft"
        shimmer={false}
      >
        <Skeleton className="h-2.5 w-20 rounded-full" tone="muted" />
        <Skeleton className="size-4 rounded-full" tone="muted" shimmer={false} />
      </Skeleton>

      {isOpen && (
        <Skeleton
          tone="soft"
          radius="md"
          shimmer={false}
          className="z-10 mt-2 min-w-[12rem] rounded-md border border-border bg-white p-1 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            {Array.from({ length: itemCount }).map((_, index) => (
              <React.Fragment key={index}>
                <Skeleton
                  className="flex h-8 items-center gap-3 rounded-sm px-2"
                  tone="muted"
                >
                  <Skeleton className="size-4 rounded-full" tone="soft" />
                  <Skeleton className="h-2.5 flex-1 rounded-full" tone="muted" />
                  <Skeleton className="h-2 w-10 rounded-full" tone="soft" />
                </Skeleton>
                {withSections && (index + 1) % sectionSize === 0 && index < itemCount - 1 && (
                  <Skeleton className="mx-1 h-px rounded-full" tone="muted" shimmer={false} />
                )}
              </React.Fragment>
            ))}
          </div>
        </Skeleton>
      )}
    </div>
  )
}
