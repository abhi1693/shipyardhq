"use client"

import { Button } from "@/components/atoms/button"
import { Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function UnarchiveButton({
  label = "Unarchive",
  className,
  children,
  ...props
}: Props) {
  return (
    <Button variant="outline" className={cn(className)} {...props}>
      <Undo2 className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}

