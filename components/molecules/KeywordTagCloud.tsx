import Link from "next/link"

import { cn } from "@/lib/utils"

interface TagCloudItem {
  slug: string
  label: string
  count: number
  href: string
}

interface KeywordTagCloudProps {
  items: TagCloudItem[]
  activeSlug?: string
  className?: string
}

const SIZE_CLASSES = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
] as const

const OPACITY_CLASSES = [
  "text-slate-400",
  "text-slate-500",
  "text-slate-600",
  "text-slate-700",
  "text-slate-800",
] as const

function scaleIndex(
  count: number,
  min: number,
  max: number,
  steps: number,
): number {
  if (max <= min) return Math.floor(steps / 2)
  const ratio = (count - min) / (max - min)
  const index = Math.round(ratio * (steps - 1))
  return Math.max(0, Math.min(steps - 1, index))
}

export function KeywordTagCloud({
  items,
  activeSlug,
  className,
}: KeywordTagCloudProps) {
  if (!items.length) return null

  const counts = items.map((item) => item.count)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-start gap-x-4 gap-y-3",
        className,
      )}
      role="navigation"
    >
      {items.map((item) => {
        const sizeIdx = scaleIndex(
          item.count,
          minCount,
          maxCount,
          SIZE_CLASSES.length,
        )
        const opacityIdx = scaleIndex(
          item.count,
          minCount,
          maxCount,
          OPACITY_CLASSES.length,
        )
        const sizeClass = SIZE_CLASSES[sizeIdx]
        const colorClass = OPACITY_CLASSES[opacityIdx]
        const isActive = activeSlug === item.slug

        return (
          <Link
            key={item.slug}
            href={item.href}
            className={cn(
              "transition-all duration-200 ease-out",
              "hover:text-sky-600 hover:drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
              sizeClass,
              colorClass,
              isActive &&
                "text-sky-700 font-semibold underline underline-offset-4",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
            <span className="sr-only"> ({item.count} products)</span>
          </Link>
        )
      })}
    </div>
  )
}

export default KeywordTagCloud
