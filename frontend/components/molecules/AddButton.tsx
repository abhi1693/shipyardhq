"use client"

import { Button } from "@/components/atoms/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function AddButton({
  label = "Add",
  className,
  children,
  ...props
}: Props) {
  return (
    <Button
      className={cn(
        "rounded-full border border-[color:var(--brand-1)/0.3] bg-background/95 px-5 py-2 text-sm font-semibold text-[color:var(--brand-1)] transition-colors hover:border-[color:var(--brand-1)/0.4] hover:bg-[color:var(--brand-1)/0.08]",
        className,
      )}
      {...props}
    >
      <Plus className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}
