"use client"

import { ReactNode, useState } from "react"
import { Button } from "@/components/atoms/button"
import { toast } from "sonner"

export default function CopyButton({
  text,
  label = "Copy",
  size = "xs",
  variant = "outline",
  resolveAbsolute = false,
  children,
}: {
  text: string
  label?: string
  size?: "xs" | "sm" | "default"
  variant?: "outline" | "secondary" | "default"
  resolveAbsolute?: boolean
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      size={size === "xs" ? "sm" : size}
      variant={variant}
      onClick={async () => {
        const toCopy = (() => {
          if (resolveAbsolute && text && text.startsWith("/") && typeof window !== "undefined") {
            try {
              const origin = window.location.origin
              return `${origin}${text}`
            } catch {
              return text
            }
          }
          return text
        })()

        async function modernCopy(v: string) {
          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(v)
            return true
          }
          return false
        }

        function fallbackCopy(v: string) {
          try {
            const el = document.createElement("textarea")
            el.value = v
            el.style.position = "fixed"
            el.style.opacity = "0"
            document.body.appendChild(el)
            el.focus()
            el.select()
            const ok = document.execCommand("copy")
            document.body.removeChild(el)
            return ok
          } catch {
            return false
          }
        }

        const ok = (await modernCopy(toCopy)) || fallbackCopy(toCopy)
        if (ok) {
          setCopied(true)
          toast.success("Copied to clipboard")
          setTimeout(() => setCopied(false), 1200)
        } else {
          toast.error("Copy failed")
        }
      }}
    >
      {copied ? "Copied" : children ?? label}
    </Button>
  )
}
