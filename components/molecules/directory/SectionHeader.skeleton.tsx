import * as React from "react"

import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface DirectorySectionHeaderSkeletonProps
  extends React.ComponentProps<"div"> {
  align?: "left" | "center"
  showKicker?: boolean
  descriptionLines?: number
  withAction?: boolean
}

export function DirectorySectionHeaderSkeleton({
  className,
  align = "left",
  showKicker = true,
  descriptionLines = 2,
  withAction = false,
  ...props
}: DirectorySectionHeaderSkeletonProps) {
  const isCentered = align === "center"
  const descriptionCount = Math.max(0, descriptionLines)

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        isCentered && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
      data-slot="directory-section-header-skeleton"
      {...props}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          isCentered && "sm:items-center sm:text-center",
        )}
      >
        {showKicker && (
          <BadgeSkeleton
            variant="outline"
            labelWidth="6rem"
            leadingIcon
            className="h-7"
          />
        )}
        <HeadingSkeleton
          lines={2}
          centered={isCentered}
          className={cn(isCentered ? "sm:text-center" : "sm:text-left")}
        />
        {descriptionCount > 0 ? (
          <div
            className={cn(
              "space-y-2",
              isCentered && "mx-auto max-w-3xl",
              !isCentered && "max-w-3xl",
            )}
          >
            {Array.from({ length: descriptionCount }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key -- order decorative
                key={index}
                className={cn(
                  "h-2.5 rounded-full",
                  index === descriptionCount - 1 ? "w-3/4" : "w-full",
                )}
                tone="muted"
              />
            ))}
          </div>
        ) : null}
      </div>
      {withAction ? (
        <div className={cn("shrink-0", isCentered && "sm:w-full sm:max-w-xs")}>
          <ButtonSkeleton
            variant="outline"
            size="sm"
            labelWidth="6rem"
            className={cn(isCentered && "w-full justify-center")}
          />
        </div>
      ) : null}
    </div>
  )
}

export default DirectorySectionHeaderSkeleton
