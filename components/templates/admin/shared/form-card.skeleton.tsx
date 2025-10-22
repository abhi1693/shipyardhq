import * as React from "react"

import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"
import { cn } from "@/lib/utils"

export type AdminFormFieldSkeleton =
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | {
      type?: "input" | "textarea" | "select" | "checkbox"
      helper?: boolean
      columns?: number
    }

interface AdminFormCardSkeletonProps extends React.ComponentProps<"div"> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
  fields?: AdminFormFieldSkeleton[]
  actions?: number
  columns?: number
  showLegend?: boolean
}

const maxWidthClass: Record<
  NonNullable<AdminFormCardSkeletonProps["maxWidth"]>,
  string
> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-none",
}

export function AdminFormCardSkeleton({
  className,
  maxWidth = "md",
  fields,
  actions = 1,
  columns = 1,
  showLegend = false,
  ...props
}: AdminFormCardSkeletonProps) {
  return (
    <div
      className={cn("mx-auto w-full", maxWidthClass[maxWidth], className)}
      data-slot="admin-form-card-skeleton"
      aria-hidden="true"
      {...props}
    >
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        inset
        className="space-y-6 p-6 shadow-[0_24px_48px_-32px_rgba(7,78,134,0.35)]"
      >
        <div className="space-y-2">
          <HeadingSkeleton lines={1} />
          {showLegend ? (
            <Skeleton
              className="h-2.5 w-3/4 rounded-full"
              tone="muted"
              shimmer={false}
            />
          ) : null}
        </div>

        <FormSkeleton
          fields={fields}
          actions={actions}
          columns={columns}
          className="border border-white/35 bg-white/90"
        />
      </Skeleton>
    </div>
  )
}
