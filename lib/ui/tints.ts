import type { ClassValue } from "clsx"

import { cn } from "@/lib/utils"

/**
 * Applies the core Shipyard blue-to-teal gradient to a class string.
 * Useful for surfaces that need the brand gradient background.
 */
export function brandGradient(...classes: ClassValue[]): string {
  return cn(
    "bg-[linear-gradient(135deg,var(--brand-1),var(--brand-2))]",
    classes,
  )
}

/**
 * Applies Shipyard's glass tint treatment used on gradient surfaces.
 * Accepts additional Tailwind classes to layer on top of the shared base.
 */
export function gradientTint(...classes: ClassValue[]): string {
  return cn("border border-white/40 bg-white/10", classes)
}
