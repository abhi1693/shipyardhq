import * as React from "react"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import { badgeVariants } from "./badge"
import { Skeleton, type SkeletonProps } from "./skeleton"

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

const toneByVariant: Record<BadgeVariant, SkeletonProps["tone"]> = {
  default: "brand",
  secondary: "soft",
  destructive: "brand",
  outline: "soft",
  success: "brand",
}

interface BadgeSkeletonProps
  extends Omit<React.ComponentProps<typeof Skeleton>, "children">,
    VariantProps<typeof badgeVariants> {
  labelWidth?: number | string
  leadingIcon?: boolean
}

function resolveWidth(value?: number | string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`
  }
  if (typeof value === "string") {
    return value
  }
  return undefined
}

export function BadgeSkeleton({
  className,
  variant = "default",
  tone,
  labelWidth,
  leadingIcon = false,
  ...props
}: BadgeSkeletonProps) {
  const resolvedTone = tone ?? toneByVariant[variant ?? "default"] ?? "soft"
  const resolvedWidth = resolveWidth(labelWidth)

  return (
    <Skeleton
      data-slot="badge-skeleton"
      tone={resolvedTone}
      radius="sm"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 overflow-hidden rounded-md border border-white/10 px-2 py-0.5 text-xs",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-md border border-white/20 bg-gradient-to-r from-white/10 via-white/5 to-white/0 opacity-80 dark:border-white/10 dark:from-white/5 dark:via-white/0 dark:to-transparent"
      />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {leadingIcon && (
          <span className="size-3 rounded-full bg-white/70 dark:bg-white/20" />
        )}
        <span
          className="h-2 rounded-full bg-white/75 dark:bg-white/15"
          style={{ width: resolvedWidth ?? "3.5rem" }}
        />
      </span>
    </Skeleton>
  )
}
