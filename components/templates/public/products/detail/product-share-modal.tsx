"use client"

import { useCallback, useMemo, useState } from "react"
import {
  IconBrandFacebook as Facebook,
  IconBrandLinkedin as Linkedin,
  IconBrandX as Twitter,
} from "@tabler/icons-react"
import { Copy, MessageCircle, Share2, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface ProductShareModalProps {
  productName: string
  productTagline?: string | null
  shareUrl: string
  className?: string
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the textarea fallback.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "0"

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    return document.execCommand("copy")
  } finally {
    document.body.removeChild(textarea)
  }
}

export function ProductShareModal({
  productName,
  productTagline,
  shareUrl,
  className,
}: ProductShareModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareText = useMemo(() => {
    const parts = [productName.trim()]
    if (productTagline?.trim()) {
      parts.push(productTagline.trim())
    }
    return parts.filter(Boolean).join(" - ")
  }, [productName, productTagline])

  const socialTargets = useMemo(
    () => [
      {
        label: "Twitter",
        icon: Twitter,
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      },
      {
        label: "LinkedIn",
        icon: Linkedin,
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      },
      {
        label: "Facebook",
        icon: Facebook,
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      },
      {
        label: "Reddit",
        icon: MessageCircle,
        href: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(productName)}`,
      },
    ],
    [productName, shareText, shareUrl],
  )

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const copyLink = useCallback(async () => {
    const ok = await copyTextToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } else {
      setCopied(false)
    }
  }, [shareUrl])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-[#0051d5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30",
          className,
        )}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        <span>Share</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b1c30]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-share-title"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30"
              aria-label="Close share modal"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

            <h2
              id="product-share-title"
              className="mb-6 text-lg font-semibold text-foreground"
            >
              Share this product
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="product-share-link"
                  className="text-[11px] font-medium uppercase text-muted-foreground"
                >
                  Product link
                </label>
                <div className="flex gap-2">
                  <input
                    id="product-share-link"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-[#eff4ff]/60 px-3 py-2 text-sm text-foreground focus:outline-none"
                    readOnly
                    value={shareUrl}
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-foreground/80"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Social share
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {socialTargets.map(({ label, icon: Icon, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-border p-3 text-[#0051d5] transition-colors hover:bg-[#eff4ff]"
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      <span className="text-[10px] font-bold uppercase text-foreground">
                        {label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
