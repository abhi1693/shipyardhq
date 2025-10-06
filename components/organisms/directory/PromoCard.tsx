import Link from "next/link"
import { ReactNode } from "react"

import { Button } from "@/components/atoms/button"

interface DirectoryPromoCardProps {
  title: string
  description: string
  cta: {
    label: string
    href: string
    variant?: "solid" | "ghost"
  }
  eyebrow?: string
  icon?: ReactNode
  subtleCta?: {
    label: string
    href: string
  }
}

export function DirectoryPromoCard({
  title,
  description,
  cta,
  eyebrow,
  icon,
  subtleCta,
}: DirectoryPromoCardProps) {
  return (
    <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-background/95 via-background/80 to-muted/40 p-6 shadow-sm shadow-black/5">
      <div className="space-y-5">
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {icon}
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            asChild
            size="sm"
            className={cta.variant === "ghost" ? "bg-transparent hover:bg-muted/70" : undefined}
            variant={cta.variant === "ghost" ? "ghost" : "default"}
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
          {subtleCta ? (
            <Link
              href={subtleCta.href}
              className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {subtleCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default DirectoryPromoCard
