"use client"

import { Button } from "@/components/atoms/button"
import { Save as SaveIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function SaveButton({
  label = "Save",
  className,
  children,
  variant,
  ...props
}: Props) {
  return (
    <Button
      variant={variant ?? "success"}
      className={cn("", className)}
      {...props}
    >
      <SaveIcon className="size-4" />
      {children ?? label}
    </Button>
  )
}
