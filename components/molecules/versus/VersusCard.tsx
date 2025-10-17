import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import clsx from "clsx"

import type { VersusProduct } from "@/actions/public/products/versus"
import { productPath } from "@/lib/routes"
import { Button } from "@/components/atoms/button"

const SIDE_LABELS: Record<"left" | "right", string | null> = {
  left: null,
  right: null,
}

const SIDE_STYLES = {
  left: {
    shadow: "shadow-[0_22px_70px_-40px_rgba(12,86,152,0.55)]",
    glow:
      "before:bg-[radial-gradient(circle_at_top,rgba(12,86,152,0.32),transparent_72%)]",
    upvote:
      "border-[color:var(--brand-1)/0.3] text-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)/0.08]",
  },
  right: {
    shadow: "shadow-[0_24px_70px_-36px_rgba(155,93,229,0.52)]",
    glow:
      "before:bg-[radial-gradient(circle_at_top,rgba(155,93,229,0.36),transparent_70%)]",
    upvote:
      "border-[color:var(--brand-2)/0.3] text-[color:var(--brand-2)] hover:bg-[color:var(--brand-2)/0.08]",
  },
} as const

export interface VersusCardActionProps {
  className: string
  side: "left" | "right"
}

interface VersusCardProps {
  product: VersusProduct
  side: "left" | "right"
  action?: (props: VersusCardActionProps) => ReactNode
}

export function VersusCard({ product, side, action }: VersusCardProps) {
  const makerCopy = product.makerName ? `Built by ${product.makerName}` : null
  const accent = SIDE_STYLES[side]
  const website = resolveWebsite(product.websiteUrl)

  const actionNode = action
    ? action({
        className: clsx(
          "border bg-white/95 px-3 py-1.5 text-sm font-semibold transition-colors",
          accent.upvote,
        ),
        side,
      })
    : null

  return (
    <article
      className={clsx(
        "relative mx-auto flex h-full w-full max-w-[24rem] flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-white/90 p-5 backdrop-blur md:h-full md:w-[24rem] md:flex-1",
        accent.shadow,
        accent.glow,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-white/80 shadow-sm">
            <Image
              src={product.logo}
              alt={product.name}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                {SIDE_LABELS[side] ? (
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] bg-muted/70 text-muted-foreground">
                    {SIDE_LABELS[side]}
                  </span>
                ) : null}
                <h3 className="text-xl font-semibold text-foreground">
                  {product.name}
                </h3>
                {product.category?.name ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {product.category.name}
                  </p>
                ) : null}
              </div>
              {actionNode ? <div className="shrink-0">{actionNode}</div> : null}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {product.tagline}
            </p>
            {makerCopy ? (
              <p className="text-xs text-muted-foreground">{makerCopy}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {website ? (
          <a
            href={website.href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {website.label}
          </a>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href={productPath(product.slug)}>View launch</Link>
          </Button>
        )}
      </div>
    </article>
  )
}

export function VersusDivider() {
  return (
    <div className="relative my-2 flex min-h-[9rem] flex-col items-center justify-center gap-6 md:my-0 md:h-full md:min-h-0 md:w-auto md:self-stretch md:gap-0 md:px-6">
      <span className="pointer-events-none absolute left-1/2 top-1/2 hidden h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,117,186,0.22),transparent_70%)] blur-xl md:block" />
      <span className="block h-12 w-px bg-[linear-gradient(180deg,rgba(12,86,152,0),rgba(12,86,152,0.45),rgba(12,86,152,0))] md:hidden" />
      <div className="flex h-full items-center">
        <LightningGlyph />
      </div>
      <span className="block h-12 w-px bg-[linear-gradient(180deg,rgba(155,93,229,0),rgba(155,93,229,0.45),rgba(155,93,229,0))] md:hidden" />
    </div>
  )
}

function LightningGlyph() {
  return (
    <div className="relative grid h-18 w-18 place-items-center rounded-2xl border border-[rgba(255,255,255,0.3)] bg-[radial-gradient(circle_at_32%_18%,rgba(24,96,168,0.82),rgba(24,96,168,0.23)62%,rgba(24,96,168,0.08)),radial-gradient(circle_at_68%_82%,rgba(155,93,229,0.68),rgba(155,93,229,0.22)72%,rgba(155,93,229,0.08))] shadow-[0_42px_100px_-45px_rgba(16,78,139,0.82)] before:pointer-events-none before:absolute before:-inset-4 before:-z-10 before:rounded-[3rem] before:bg-[radial-gradient(circle,rgba(34,128,210,0.5),transparent_70%)] before:blur-[45px] after:pointer-events-none after:absolute after:-inset-6 after:-z-20 after:rounded-[3.4rem] after:bg-[radial-gradient(circle,rgba(155,93,229,0.42),transparent_78%)] after:blur-[70px] md:h-[6rem] md:w-[6rem]">
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(42deg,rgba(255,255,255,0.28),transparent)]" />
      <span className="pointer-events-none absolute inset-[0.45rem] rounded-[1.9rem] border border-white/20 shadow-[0_4px_22px_rgba(16,78,139,0.25)]" />
      <span className="pointer-events-none absolute inset-0 animate-ping rounded-2xl bg-[radial-gradient(circle,rgba(124,179,255,0.25),transparent_70%)] opacity-60" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(52deg,rgba(255,255,255,0.22),transparent)]" />
      <span className="pointer-events-none absolute inset-1 rounded-2xl bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.22),transparent_68%)] opacity-80" />
      <svg
        viewBox="0 0 80 100"
        className="relative z-10 h-11 w-9 translate-y-0 text-white drop-shadow-[0_10px_24px_rgba(16,78,139,0.78)]"
        aria-hidden="true"
      >
        <path d="M44 8 26 44h15l-8 46 30-56H47l9-26z" fill="currentColor" />
      </svg>
    </div>
  )
}

function resolveWebsite(url?: string | null):
  | {
      href: string
      label: string
    }
  | null {
  if (!url) return null
  try {
    const href = url.startsWith("http") ? url : `https://${url}`
    const target = new URL(href)
    target.searchParams.set("utm_source", "shipyardhq")
    target.searchParams.set("utm_medium", "vs-arena")
    target.searchParams.set("utm_campaign", "versus-battle")
    const host = target.hostname.replace(/^www\./, "")
    return { href: target.toString(), label: host }
  } catch (error) {
    console.warn("Failed to resolve website URL for Versus card:", { url, error })
    return null
  }
}
