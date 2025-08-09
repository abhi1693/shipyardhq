import * as React from "react"
import { cn } from "@/lib/utils"

type UniformCardProps = {
  size?: "normal" | "compact"
  className?: string
  children: React.ReactNode
}

// A lightweight wrapper to enforce consistent card footprint in grids.
// - Maintains width from the grid.
// - Locks a minimum height per size and stretches to full height.
// - Clips overflow so extra content does not change dimensions.
export function UniformCard({
  size = "normal",
  className,
  children,
}: UniformCardProps) {
  const sizeCls = size === "compact" ? "min-h-[10rem]" : "min-h-[12rem]"

  return (
    <div
      className={cn(
        "h-full overflow-hidden rounded-xl transition-transform duration-200 will-change-transform hover:-translate-y-0.5",
        sizeCls,
        className,
      )}
    >
      {/* Inner stretcher so children can expand without altering outer height */}
      <div className="flex h-full flex-col">{children}</div>
    </div>
  )
}

export default UniformCard
