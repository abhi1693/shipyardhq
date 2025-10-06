import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DirectorySectionHeaderProps {
  title: string
  kicker?: string
  description?: ReactNode
  action?: ReactNode
  align?: "left" | "center"
  className?: string
}

export function DirectorySectionHeader({
  title,
  kicker,
  description,
  action,
  align = "left",
  className,
}: DirectorySectionHeaderProps) {
  const isCentered = align === "center"
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        isCentered && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className="space-y-2">
        {kicker ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {kicker}
          </span>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <div className="max-w-3xl text-sm text-muted-foreground">
            {typeof description === "string" ? <p>{description}</p> : description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export default DirectorySectionHeader
