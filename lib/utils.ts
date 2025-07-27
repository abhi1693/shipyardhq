import * as Icons from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import s from "slugify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return s(text, {
    lower: true,
    strict: true,
  })
}

export function getLucideIcon(name: string) {
  return Icons[name as keyof typeof Icons] || null
}

export const TAILWIND_COLORS = [
  "blue",
  "green",
  "yellow",
  "red",
  "purple",
  "orange",
  "pink",
  "teal",
  "cyan",
  "gray",
] as const

export type TailwindColor = (typeof TAILWIND_COLORS)[number]

export const badgeColorMap: Record<TailwindColor, string> = Object.fromEntries(
  TAILWIND_COLORS.map((color) => [
    color,
    `bg-${color}-100 text-${color}-800 border-${color}-300`,
  ]),
) as Record<TailwindColor, string>
