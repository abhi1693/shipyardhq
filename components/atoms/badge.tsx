import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border border-[color:var(--brand-1)/0.35] bg-[linear-gradient(135deg,var(--brand-1)/0.18,var(--brand-2)/0.22)] text-[color:var(--brand-1)] shadow-[0px_12px_30px_-28px_rgba(7,78,134,0.65)] hover:border-[color:var(--brand-1)/0.45] hover:bg-[linear-gradient(135deg,var(--brand-1)/0.22,var(--brand-2)/0.26)]",
        secondary:
          "border border-[color:var(--brand-2)/0.32] bg-[color:var(--brand-2)/0.12] text-[color:var(--brand-2-text,#0a5678)] shadow-[0px_10px_25px_-28px_rgba(20,115,185,0.45)] hover:border-[color:var(--brand-2)/0.42] hover:bg-[color:var(--brand-2)/0.18]",
        destructive:
          "border border-red-500/50 bg-red-500/15 text-red-500 shadow-[0px_10px_25px_-28px_rgba(220,38,38,0.55)] hover:bg-red-500/20",
        outline:
          "border border-[color:var(--brand-1)/0.28] bg-background/85 text-foreground shadow-[0px_8px_22px_-25px_rgba(7,78,134,0.45)] hover:border-[color:var(--brand-1)/0.38] hover:bg-[color:var(--brand-1)/0.08]",
        success:
          "border border-emerald-500/45 bg-emerald-500/15 text-emerald-500 shadow-[0px_10px_25px_-28px_rgba(16,163,127,0.45)] hover:bg-emerald-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
