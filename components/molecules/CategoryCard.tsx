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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(90deg,var(--brand-1),var(--brand-3))] text-white shadow-sm">
            <CategoryIcon icon={icon} size={16} className="text-white" />
          </span>
          <span className="font-semibold text-sm md:text-base truncate">
            {name}
          </span>
        </div>
        {typeof count === "number" && (
          <Badge variant="secondary" className="shrink-0">
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
