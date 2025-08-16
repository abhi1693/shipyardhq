"use client"

import { Button } from "@/components/atoms/button"
import { Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function ArchiveButton({
  label = "Archive",
  className,
  children,
  ...props
}: Props) {
  return (
    <Button variant="destructive" className={cn(className)} {...props}>
      <Archive className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}
