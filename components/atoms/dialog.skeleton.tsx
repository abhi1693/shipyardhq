import * as React from "react"

import { cn } from "@/lib/utils"

import { ButtonSkeleton } from "./button.skeleton"
import { HeadingSkeleton } from "./heading.skeleton"
import { Skeleton } from "./skeleton"

interface DialogSkeletonProps extends React.ComponentProps<"div"> {
  actions?: number
  showClose?: boolean
}

export function DialogSkeleton({
  className,
  actions = 2,
  showClose = true,
  ...props
}: DialogSkeletonProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
        className,
      )}
      data-slot="dialog-skeleton"
      {...props}
    >
      <DialogContentSkeleton actions={actions} showClose={showClose} />
    </div>
  )
}

interface DialogContentSkeletonProps
  extends React.ComponentProps<typeof Skeleton> {
  actions?: number
  showClose?: boolean
}

export function DialogContentSkeleton({
  className,
  actions = 2,
  showClose = true,
  ...props
}: DialogContentSkeletonProps) {
  const actionCount = Math.max(0, actions)

  return (
    <Skeleton
      tone="soft"
      radius="lg"
      shimmer={false}
      className={cn(
        "relative w-[min(36rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-white p-6 shadow-xl",
        className,
      )}
      data-slot="dialog-content-skeleton"
      {...props}
    >
      {showClose && (
        <Skeleton
          className="absolute right-4 top-4 size-8 rounded-full"
          tone="muted"
          shimmer={false}
        />
      )}
      <DialogHeaderSkeleton className="pr-10" />
      <DialogBodySkeleton className="mt-4" />
      {actionCount > 0 && (
        <DialogFooterSkeleton
          className="mt-6"
          actions={actionCount}
        />
      )}
    </Skeleton>
  )
}

interface DialogHeaderSkeletonProps extends React.ComponentProps<"div"> {}

export function DialogHeaderSkeleton({
  className,
  ...props
}: DialogHeaderSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-slot="dialog-header-skeleton"
      {...props}
    >
      <HeadingSkeleton lines={2} centered={false} />
    </div>
  )
}

interface DialogBodySkeletonProps extends React.ComponentProps<"div"> {
  lines?: number
}

export function DialogBodySkeleton({
  className,
  lines = 3,
  ...props
}: DialogBodySkeletonProps) {
  const lineCount = Math.max(1, lines)

  return (
    <div
      className={cn("space-y-2.5", className)}
      data-slot="dialog-body-skeleton"
      {...props}
    >
      {Array.from({ length: lineCount }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-2.5 rounded-full",
            index === lineCount - 1 ? "w-2/3" : "w-full",
          )}
          tone="muted"
        />
      ))}
    </div>
  )
}

interface DialogFooterSkeletonProps extends React.ComponentProps<"div"> {
  actions?: number
}

export function DialogFooterSkeleton({
  className,
  actions = 2,
  ...props
}: DialogFooterSkeletonProps) {
  const actionCount = Math.max(1, actions)

  return (
    <div
      className={cn("flex flex-wrap justify-end gap-3", className)}
      data-slot="dialog-footer-skeleton"
      {...props}
    >
      {Array.from({ length: actionCount }).map((_, index) => (
        <ButtonSkeleton
          key={index}
          variant={index === actionCount - 1 ? "default" : "outline"}
          size="sm"
          labelWidth={index === actionCount - 1 ? "6rem" : "4.5rem"}
        />
      ))}
    </div>
  )
}
