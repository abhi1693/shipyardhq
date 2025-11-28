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

export function ensureUrlHasSchema(
  url: string,
  fallbackScheme: string = "https",
) {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const sanitizedFallback = fallbackScheme.replace(/:\/\/$/, "")
  return `${sanitizedFallback}://${trimmed.replace(/^\/+/, "")}`
}
