"use client"

import { HeartHandshake } from "lucide-react"
import UpvoteSquareButton from "@/components/molecules/UpvoteSquareButton"

interface SupportHeroCardProps {
  productId: string
  productName: string
  initialCount: number
  initialUpvoted: boolean
  isSignedIn: boolean
  action: (
    prevState: { upvotes: number; upvoted: boolean; error?: string },
    formData: FormData,
  ) => Promise<{ upvotes: number; upvoted: boolean; error?: string }>
}

export function SupportHeroCard({
  productId,
  productName,
  initialCount,
  initialUpvoted,
  isSignedIn,
  action,
}: SupportHeroCardProps) {
  const supporterCopy = isSignedIn
    ? "Add your support to push this crew higher on the charts."
    : "Sign in to cast your vote and help this launch get discovered."

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[color:var(--brand-2)/0.3] bg-gradient-to-br from-[color:var(--brand-1)/0.12] via-background/96 to-background/96 p-6 text-foreground shadow-[0_35px_90px_-60px_rgba(8,64,112,0.65)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_55%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[color:var(--brand-2)/0.12] p-2 text-[color:var(--brand-2)]">
            <HeartHandshake className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
              Support this product
            </span>
            <h3 className="text-lg font-semibold">
              Help {productName} climb the leaderboard
            </h3>
          </div>
        </div>

        <p className="max-w-md text-sm text-muted-foreground">
          {supporterCopy}
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex justify-center">
            <UpvoteSquareButton
              productId={productId}
              initialCount={initialCount}
              initialUpvoted={initialUpvoted}
              title="Community upvotes"
              className="text-base"
              action={action}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
