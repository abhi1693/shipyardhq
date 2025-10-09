import Link from "next/link"
import { IconArrowUpRight } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"

interface MakerCardProps {
  href: string
  name: string
  launches: number
  initials: string
  avatarUrl?: string | null
  rank?: number
  variant?: "default" | "highlight"
}

const variantClasses = {
  default:
    "rounded-2xl border border-border/70 bg-background/80 p-6 shadow-[0_26px_70px_-56px_rgba(7,58,104,0.65)] backdrop-blur hover:border-[color:var(--brand-1)/0.28] hover:shadow-[0_34px_90px_-60px_rgba(7,78,134,0.6)]",
  highlight:
    "rounded-3xl border border-[color:var(--brand-1)/0.28] bg-[radial-gradient(120%_120%_at_92%_0%,var(--brand-1)/0.14,transparent_60%),radial-gradient(120%_120%_at_0%_100%,var(--brand-2)/0.12,transparent_70%)] p-7 shadow-[0_36px_110px_-58px_rgba(7,78,134,0.68)] backdrop-blur hover:border-[color:var(--brand-1)/0.35] hover:shadow-[0_45px_120px_-62px_rgba(7,78,134,0.7)]",
}

export function MakerCard({
  href,
  name,
  launches,
  initials,
  avatarUrl,
  rank,
  variant = "default",
}: MakerCardProps) {
  const launchesLabel = `${launches} launch${launches === 1 ? "" : "es"}`

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col gap-6 overflow-hidden transition-transform duration-300 hover:-translate-y-1",
        variantClasses[variant],
      )}
    >
      {rank ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-1)]">
          #{rank}
          <span className="text-[10px] text-muted-foreground">Top maker</span>
        </span>
      ) : null}

      <div className="flex items-center gap-4">
        <Avatar
          className={cn(
            "h-12 w-12 bg-muted/60 text-base font-semibold text-foreground shadow-[0_18px_40px_-32px_rgba(7,58,104,0.6)]",
            variant === "highlight" ? "h-14 w-14 text-lg" : "",
          )}
        >
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
          ) : null}
          <AvatarFallback className="flex h-full w-full items-center justify-center rounded-[inherit] bg-[color:var(--brand-1)/0.12] text-current">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-lg font-semibold tracking-tight text-foreground">
            {name}
          </p>
          <p className="text-sm text-muted-foreground">{launchesLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium text-foreground">View maker profile</span>
        <IconArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>
    </Link>
  )
}

export default MakerCard
