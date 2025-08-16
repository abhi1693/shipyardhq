"use client"

import { Button } from "@/components/atoms/button"
import { EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function UnpublishButton({
  label = "Unpublish",
  className,
  children,
  ...props
}: Props) {
  return (
    <Button variant="outline" className={cn(className)} {...props}>
      <EyeOff className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}

