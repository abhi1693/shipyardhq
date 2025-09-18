import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageSectionHeader({
  title,
  subtitle,
  action,
  align = "left",
  underline = true,
  className,
  eyebrow,
}: {
  title: string
  subtitle?: string | ReactNode
  action?: ReactNode
  align?: "left" | "center"
  underline?: boolean
  className?: string
  eyebrow?: string
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
        {eyebrow ? (
          <div
            className={cn(
              "mb-4 flex",
              isCenter ? "justify-center" : "justify-start",
            )}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-3)]" />
              {eyebrow}
            </span>
          </div>
        ) : null}
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
