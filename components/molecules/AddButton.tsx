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
    <Button className={cn(className)} {...props}>
      <Plus className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}
