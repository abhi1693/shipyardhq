import type { ClassValue } from "clsx"

import { cn } from "@/lib/utils"
import { gradientTint } from "@/lib/ui/tints"

type LaunchButtonSize = "sm" | "md" | "lg"

interface LaunchButtonOptions {
  size?: LaunchButtonSize
  className?: ClassValue
}

const PRIMARY_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full bg-white text-[color:var(--brand-1)] shadow-lg transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--brand-1)/0.4]"

const SECONDARY_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full text-white transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--brand-1)/0.35]"

const PRIMARY_SIZES: Record<LaunchButtonSize, string> = {
  sm: "px-4 py-2 text-xs font-semibold",
  md: "px-5 py-2.5 text-sm font-semibold",
  lg: "px-6 py-3 text-base font-semibold",
}

const SECONDARY_SIZES: Record<LaunchButtonSize, string> = {
  sm: "px-4 py-2 text-xs font-semibold",
  md: "px-5 py-2.5 text-sm font-semibold",
  lg: "px-6 py-3 text-base font-semibold",
}

function resolveOptions(options?: LaunchButtonOptions): {
  size: LaunchButtonSize
  className?: ClassValue
} {
  return {
    size: options?.size ?? "md",
    className: options?.className,
  }
}

/**
 * Launch CTA primary button styling (white pill on gradient backgrounds).
 * Pass `size` to adjust padding/typography and `className` for additive classes.
 */
export function launchPrimaryButton(options?: LaunchButtonOptions): string {
  const { size, className } = resolveOptions(options)
  return cn(PRIMARY_BASE, PRIMARY_SIZES[size], className)
}

/**
 * Launch CTA secondary button styling, layered over the shared gradient tint.
 * Mirrors the primary helper for consistent hover/focus behaviour.
 */
export function launchSecondaryButton(options?: LaunchButtonOptions): string {
  const { size, className } = resolveOptions(options)
  return gradientTint(SECONDARY_BASE, SECONDARY_SIZES[size], className)
}
