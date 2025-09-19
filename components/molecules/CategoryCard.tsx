"use client"

import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { cn } from "@/lib/utils"

export type CategoryCardProps = {
  href: string
  name: string
  icon: string
  description?: string
  count?: number
  className?: string
}

export function CategoryCard({
  href,
  name,
  icon,
  description,
  count,
  className,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block h-full rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]">
            <CategoryIcon
              icon={icon}
              size={16}
              className="text-[color:var(--brand-1)]"
            />
          </span>
          <span className="flex-1 text-sm font-semibold leading-tight line-clamp-2 md:text-base">
            {name}
          </span>
        </div>
        {typeof count === "number" && (
          <Badge variant="secondary" className="shrink-0 self-start">
            {count} product{count !== 1 && "s"}
          </Badge>
        )}
      </div>
      {description && (
        <p className="mt-2 text-xs md:text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
    </Link>
  )
}
