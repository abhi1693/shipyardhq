import * as React from "react"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import { buttonVariants } from "./button"
import { Skeleton, type SkeletonProps } from "./skeleton"

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-9 px-4",
  sm: "h-8 px-3",
  lg: "h-11 px-6",
  icon: "size-9",
}

const labelSpacing: Record<ButtonSize, string> = {
  default: "px-4",
  sm: "px-3",
  lg: "px-6",
  icon: "p-0",
}

const toneByVariant: Record<ButtonVariant, SkeletonProps["tone"]> = {
  default: "brand",
  destructive: "brand",
  success: "brand",
  outline: "soft",
  secondary: "soft",
  ghost: "soft",
  link: "soft",
}

interface ButtonSkeletonProps
  extends Omit<React.ComponentProps<typeof Skeleton>, "children">,
    VariantProps<typeof buttonVariants> {
  labelWidth?: number | string
  icon?: boolean
}

function resolveWidth(value: ButtonSkeletonProps["labelWidth"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`
  }
  if (typeof value === "string") {
    return value
  }
  return undefined
}

export function ButtonSkeleton({
  className,
  variant = "default",
  size = "default",
  tone,
  labelWidth,
  icon = false,
  ...props
}: ButtonSkeletonProps) {
  const resolvedSize = size ?? "default"
  const resolvedSpacing = labelSpacing[resolvedSize]
  const resolvedTone = tone ?? toneByVariant[variant ?? "default"] ?? "soft"
  const labelStyle = resolveWidth(labelWidth)
  const renderLabel = resolvedSize !== "icon"

  return (
    <Skeleton
      data-slot="button-skeleton"
      tone={resolvedTone}
      radius="full"
      className={cn(
        "inline-flex items-center justify-center gap-2 overflow-hidden pointer-events-none select-none cursor-default",
        sizeStyles[resolvedSize],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/0 opacity-80 mix-blend-lighten dark:border-white/5 dark:from-white/5 dark:via-white/0 dark:to-white/0"
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 flex w-full items-center justify-center gap-2",
          resolvedSpacing,
        )}
      >
        {(icon || resolvedSize === "icon") && (
          <span
            className={cn(
              "bg-white/70 dark:bg-white/20 rounded-full",
              resolvedSize === "sm" && "size-3.5",
              resolvedSize === "default" && "size-4",
              resolvedSize === "lg" && "size-5",
              resolvedSize === "icon" && "size-4",
            )}
          />
        )}
        {renderLabel && (
          <span
            className="h-2.5 rounded-full bg-white/80 dark:bg-white/15"
            style={{ width: labelStyle ?? "6rem" }}
          />
        )}
      </span>
    </Skeleton>
  )
}
