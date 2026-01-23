import { memo } from "react"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

type RatingStarsProps = {
  rating: number
  outOf?: number
  className?: string
  size?: number
  showLabel?: boolean
  labelClassName?: string
}

function RatingStars({
  rating,
  outOf = 5,
  className,
  size = 16,
  showLabel = false,
  labelClassName,
}: RatingStarsProps) {
  const safeOutOf = Math.max(1, outOf)
  const clamped = Math.max(0, Math.min(safeOutOf, Math.round(rating)))

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: safeOutOf }, (_, idx) => {
          const filled = idx < clamped
          return (
            <Star
              key={idx}
              size={size}
              className={cn(
                "transition-colors",
                filled ? "fill-yellow-400 text-yellow-500" : "text-slate-300",
              )}
            />
          )
        })}
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-sm font-medium text-muted-foreground",
            labelClassName,
          )}
        >
          {clamped}/{safeOutOf}
        </span>
      )}
    </div>
  )
}

export default memo(RatingStars)
