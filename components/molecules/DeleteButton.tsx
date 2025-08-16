"use client"

import { Button } from "@/components/atoms/button"
import { Trash2 as TrashIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function DeleteButton({
  label = "Delete",
  className,
  children,
  variant,
  ...props
}: Props) {
  return (
    <Button
      variant={variant ?? "destructive"}
      className={cn("", className)}
      {...props}
    >
      <TrashIcon className="size-4" />
      {children ?? label}
    </Button>
  )
}
