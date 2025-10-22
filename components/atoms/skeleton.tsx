import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "relative isolate overflow-hidden border bg-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-white/5 dark:bg-slate-800/50",
  {
    variants: {
      tone: {
        neutral: "bg-slate-200/70 dark:bg-slate-800/50",
        soft: "bg-slate-100/70 dark:bg-slate-900/40",
        brand:
          "bg-[color:var(--brand-1,#074e86)/0.18] dark:bg-[color:var(--brand-2,#0ea5e9)/0.22]",
        muted: "bg-slate-200/60 dark:bg-slate-900/55",
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
        full: "rounded-full",
      },
      border: {
        subtle: "border-slate-900/5 dark:border-white/10",
        accent:
          "border-[color:var(--brand-1,#074e86)/0.3] dark:border-[color:var(--brand-2,#38bdf8)/0.35]",
        muted: "border-slate-200/70 dark:border-slate-800/60",
      },
      inset: {
        true: "shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      radius: "md",
      border: "subtle",
    },
  },
)

type SkeletonProps = React.ComponentProps<"div"> &
  VariantProps<typeof skeletonVariants> & {
    shimmer?: boolean
    children?: React.ReactNode
  }

function Skeleton({
  className,
  tone,
  radius,
  border,
  inset,
  shimmer = true,
  children,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        skeletonVariants({ tone, radius, border, inset }),
        "transition-colors duration-500 ease-out",
        shimmer &&
          "after:content-[''] after:absolute after:inset-y-0 after:-left-1/2 after:h-full after:w-2/3 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent dark:after:via-white/15",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Skeleton }
export type { SkeletonProps }
