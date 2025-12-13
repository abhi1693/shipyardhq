import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-full border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)] text-white shadow-[0_14px_28px_-18px_rgba(7,78,134,0.45)] hover:brightness-105 hover:shadow-[0_18px_36px_-18px_rgba(7,78,134,0.35)] active:brightness-95 focus-visible:border-[color:var(--brand-1)/0.55] focus-visible:ring-[color:var(--brand-1)/0.35]",
        destructive:
          "rounded-full border border-red-500/40 bg-red-500 text-white shadow-[0_14px_30px_-18px_rgba(248,113,113,0.45)] hover:bg-red-600 hover:shadow-[0_18px_40px_-20px_rgba(248,113,113,0.4)] focus-visible:ring-red-300/50",
        success:
          "rounded-full border border-emerald-500/40 bg-emerald-500 text-white shadow-[0_14px_28px_-18px_rgba(52,211,153,0.4)] hover:bg-emerald-600 hover:shadow-[0_18px_36px_-18px_rgba(16,185,129,0.4)] focus-visible:ring-emerald-300/50",
        outline:
          "rounded-full border border-[color:var(--brand-1)/0.32] bg-white/85 text-slate-900 shadow-[0_10px_24px_-18px_rgba(7,58,104,0.35)] hover:bg-[color:var(--brand-1)/0.06] hover:text-slate-900 focus-visible:border-[color:var(--brand-1)/0.55] focus-visible:ring-[color:var(--brand-1)/0.25] dark:bg-input/40 dark:text-white",
        secondary:
          "rounded-full border border-slate-200/60 bg-slate-100 text-slate-800 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)] hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-100",
        ghost:
          "rounded-full border border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60",
        link: "underline-offset-[6px] text-[color:var(--brand-1)] hover:underline focus-visible:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 px-3 has-[>svg]:px-2.5 gap-1.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
