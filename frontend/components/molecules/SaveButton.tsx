"use client"

import { Button } from "@/components/atoms/button"
import { Loader2 as LoaderIcon, Save as SaveIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
  loading?: boolean
}

export default function SaveButton({
  label = "Save",
  className,
  children,
  variant,
  loading = false,
  disabled,
  ...props
}: Props) {
  return (
    <Button
      variant={variant ?? "success"}
      className={cn("gap-2", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderIcon aria-hidden className="size-4 animate-spin" />
      ) : (
        <SaveIcon aria-hidden className="size-4" />
      )}
      {children ?? label}
    </Button>
  )
}
