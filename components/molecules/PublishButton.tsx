"use client"

import { Button } from "@/components/atoms/button"
import { Rocket } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

type Props = React.ComponentProps<typeof Button> & {
  label?: string
}

export default function PublishButton({
  label = "Publish",
  className,
  children,
  ...props
}: Props) {
  return (
    <Button className={cn(className)} {...props}>
      <Rocket className="h-4 w-4" />
      {children ?? label}
    </Button>
  )
}

