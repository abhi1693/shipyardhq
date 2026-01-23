"use client"

import Link from "next/link"

import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { cn } from "@/lib/utils"

type UseCaseCardProps = {
  href: string
  label: string
  productCount?: number
  icon?: string | null
  helperText?: string
  className?: string
}

const DEFAULT_USE_CASE_ICON = "target"

export function UseCaseCard({
  href,
  label,
  productCount,
  icon,
  helperText,
  className,
}: UseCaseCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block h-full rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]">
            <CategoryIcon
              icon={icon || DEFAULT_USE_CASE_ICON}
              size={16}
              className="text-[color:var(--brand-1)]"
            />
          </span>
          <span className="flex-1 text-sm font-semibold leading-tight line-clamp-2 md:text-base">
            {label}
          </span>
        </div>
        {typeof productCount === "number" && (
          <Badge variant="secondary" className="shrink-0 self-start">
            {productCount.toLocaleString()} product
            {productCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>
      {helperText ? (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 md:text-sm">
          {helperText}
        </p>
      ) : null}
    </Link>
  )
}
