import type { ReactNode } from "react"

export function SidebarInfoRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}
