import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  align?: "left" | "center"
  underline?: boolean
  meta?: React.ReactNode // small meta line under subtitle
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  align = "left",
  underline = false,
  meta,
  className,
}: PageHeaderProps) {
  const isCenter = align === "center"
  return (
    <div className={cn("space-y-2", isCenter && "text-center", className)}>
      <h1 className={cn("text-4xl font-bold tracking-tight", isCenter && "mx-auto")}>{title}</h1>
      {underline && (
        <div
          className={cn(
            "mt-1 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]",
            isCenter ? "mx-auto" : undefined,
          )}
        />
      )}
      {subtitle && (
        <p className={cn("text-muted-foreground", isCenter ? "max-w-2xl mx-auto" : "max-w-3xl")}>
          {subtitle}
        </p>
      )}
      {meta && (
        <div className={cn("text-sm text-muted-foreground", isCenter && "mx-auto")}>{meta}</div>
      )}
    </div>
  )
}

