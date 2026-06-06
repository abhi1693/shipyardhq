"use client"

import {
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from "react"

import {
  IconBrandBluesky,
  IconBrandFacebook,
  IconBrandReddit,
  IconBrandWhatsapp,
  IconBrandYcombinator,
  IconLink,
} from "@tabler/icons-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { cn } from "@/lib/utils"

type ShareTarget = {
  key: "copy" | "bluesky" | "facebook" | "ycombinator" | "reddit" | "whatsapp"
  label: string
  href?: string
  onClick?: () => void
  icon: ComponentType<ComponentPropsWithoutRef<"svg">>
  iconHoverClass?: string
}

interface ProductShareBarProps {
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

export function ProductShareBar({
  productName,
  productTagline,
  shareUrl,
  className,
}: ProductShareBarProps) {
  const [copied, setCopied] = useState(false)

  const shareText = useMemo(() => {
    const parts = [productName.trim()]
    if (productTagline?.trim()) {
      parts.push(`– ${productTagline.trim()}`)
    }
    parts.push(shareUrl)
    return parts.join(" ")
  }, [productName, productTagline, shareUrl])

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } else {
      setCopied(false)
    }
  }, [shareUrl])

  const targets = useMemo<ShareTarget[]>(
    () => [
      {
        key: "copy",
        label: copied ? "Copied!" : "Copy link",
        onClick: handleCopy,
        icon: IconLink,
        iconHoverClass: "group-hover:text-primary",
      },
      {
        key: "bluesky",
        label: "Share on Bluesky",
        href: `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`,
        icon: IconBrandBluesky,
        iconHoverClass: "group-hover:text-[#1185FE]",
      },
      {
        key: "facebook",
        label: "Share on Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&utm_source=shipyardhq`,
        icon: IconBrandFacebook,
        iconHoverClass: "group-hover:text-[#0866FF]",
      },
      {
        key: "ycombinator",
        label: "Share on Hacker News",
        href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(productName)}`,
        icon: IconBrandYcombinator,
        iconHoverClass: "group-hover:text-[#FF6600]",
      },
      {
        key: "reddit",
        label: "Share on Reddit",
        href: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(productName)}`,
        icon: IconBrandReddit,
        iconHoverClass: "group-hover:text-[#FF4500]",
      },
      {
        key: "whatsapp",
        label: "Share on WhatsApp",
        href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
        icon: IconBrandWhatsapp,
        iconHoverClass: "group-hover:text-[#25D366]",
      },
    ],
    [copied, handleCopy, productName, shareText, shareUrl],
  )

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full border border-border/70 bg-white px-1 py-0.5",
        "text-muted-foreground shadow-sm shadow-black/5",
        className,
      )}
    >
      {targets.map(
        ({ key, icon: Icon, label, href, onClick, iconHoverClass }) => {
          const iconClassName = cn("h-4 w-4 transition-colors", iconHoverClass)
          const content = (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={label}
                  >
                    <Icon className={iconClassName} strokeWidth={1.8} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onClick}
                    className="group inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={label}
                  >
                    <Icon className={iconClassName} strokeWidth={1.8} />
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>{label}</TooltipContent>
            </Tooltip>
          )

          return content
        },
      )}
    </div>
  )
}

export default ProductShareBar
