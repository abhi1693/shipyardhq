import React from "react"
import { cn } from "@/lib/utils"

type MaxWidth = "3xl" | "5xl" | "7xl" | "marketing" // ~84rem used on marketing sections

const maxClassMap: Record<MaxWidth, string> = {
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "7xl": "max-w-7xl",
  marketing: "max-w-[84rem]",
}

interface PublicContainerProps {
  children: React.ReactNode
  max?: MaxWidth
  className?: string
  innerClassName?: string
  paddingY?: string // e.g. `py-10`, `py-12`
  as?: "div" | "section"
  fillScreen?: boolean // include min-h-screen for page layouts
}

export default function PublicContainer({
  children,
  max = "7xl",
  className,
  innerClassName,
  paddingY = "py-10",
  as = "div",
  fillScreen = true,
}: PublicContainerProps) {
  const Tag = as === "section" ? "section" : "div"
  return (
    <Tag className={cn(fillScreen && "min-h-screen", paddingY, className)}>
      <div
        className={cn(maxClassMap[max], "mx-auto px-4 md:px-8", innerClassName)}
      >
        {children}
      </div>
    </Tag>
  )
}
