"use client"

import { HeartHandshake } from "lucide-react"
import UpvoteSquareButton from "@/components/molecules/UpvoteSquareButton"

interface SupportHeroCardProps {
  productId: string
  productName: string
  initialCount: number
  initialUpvoted: boolean
  isSignedIn: boolean
}

export function SupportHeroCard({
  productId,
  productName,
  initialCount,
  initialUpvoted,
  isSignedIn,
}: SupportHeroCardProps) {
  const supporterCopy = isSignedIn
    ? "Cheer this crew on to keep their launch on the radar."
    : "Sign in to add your vote and help this launch get discovered."

  return (
    <section className="rounded-[32px] border border-border bg-white p-6 text-foreground shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Support this product
            </span>
            <h3 className="text-lg font-semibold leading-tight">
              Help {productName} climb the leaderboard
            </h3>
          </div>
          <div className="rounded-2xl border border-border bg-white p-2 text-muted-foreground">
            <HeartHandshake className="size-5" aria-hidden />
          </div>
        </div>

        <p className="max-w-sm text-sm text-muted-foreground">
          {supporterCopy}
        </p>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
          <UpvoteSquareButton
            productId={productId}
            initialCount={initialCount}
            initialUpvoted={initialUpvoted}
            title="Community upvotes"
            className="border border-border bg-white bg-none px-3.5 py-2 text-base font-semibold text-foreground shadow-none ring-0 transition hover:bg-muted"
          />
          <span className="text-xs font-medium text-muted-foreground">
            Upvotes surface this launch to more members.
          </span>
        </div>
      </div>
    </section>
  )
}
