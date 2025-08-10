import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageSectionHeader({
  title,
  subtitle,
  action,
  align = "left",
  underline = true,
  className,
}: {
  title: string
  subtitle?: string | ReactNode
  action?: ReactNode
  align?: "left" | "center"
  underline?: boolean
  className?: string
}) {
  const isCenter = align === "center"
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4",
        isCenter && "flex-col items-center text-center",
        className,
      )}
    >
      <div className={cn("text-left", isCenter && "text-center")}>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {underline && (
          <div className="mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />
        )}
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {!isCenter && action ? action : null}
    </div>
  )
}

export default PageSectionHeader
