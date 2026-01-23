import type { ClassValue } from "clsx"

import { cn } from "@/lib/utils"

/**
 * Applies the core Shipyard brand background as a solid color.
 * Useful for surfaces that need the brand background.
 */
export function brandGradient(...classes: ClassValue[]): string {
  return cn("bg-[color:var(--brand-1)]", classes)
}

/**
 * Applies Shipyard's glass tint treatment used on gradient surfaces.
 * Accepts additional Tailwind classes to layer on top of the shared base.
 */
export function gradientTint(...classes: ClassValue[]): string {
  return cn("border border-white/40 bg-white/10", classes)
}
