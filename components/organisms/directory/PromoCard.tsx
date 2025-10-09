import Link from "next/link"
import { ReactNode } from "react"

import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

interface DirectoryPromoCardProps {
  title: string
  description: string
  cta: {
    label: string
    href: string
    variant?: "solid" | "ghost"
    icon?: ReactNode
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
    <section
      className={brandGradient(
        "rounded-3xl border border-border p-6 shadow-sm text-white",
      )}
    >
      <div className="space-y-5">
        {eyebrow ? (
          <span
            className={gradientTint(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80",
            )}
          >
            {icon}
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-white/90">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={cta.href}
            className={
              cta.variant === "ghost"
                ? launchSecondaryButton({ size: "sm" })
                : launchPrimaryButton({ size: "sm" })
            }
          >
            {cta.icon ?? null}
            {cta.label}
          </Link>
          {subtleCta ? (
            <Link
              href={subtleCta.href}
              className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
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
