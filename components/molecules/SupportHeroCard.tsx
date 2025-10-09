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
    ? "Cheer this team on to keep their launch on the radar."
    : "Sign in to add your vote and help this launch get discovered."

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              Support signal
            </span>
            <h3 className="text-xl font-semibold leading-tight text-foreground">
              Help {productName} gain momentum
            </h3>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            {supporterCopy}
          </p>
        </div>
        <div className="hidden size-12 items-center justify-center rounded-full border border-border text-muted-foreground sm:flex">
          <HeartHandshake className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <UpvoteSquareButton
          productId={productId}
          initialCount={initialCount}
          initialUpvoted={initialUpvoted}
          title="Community upvotes"
          className="bg-white px-4 py-2"
        />
        <span className="text-xs font-medium text-muted-foreground">
          Upvotes surface this launch to more members.
        </span>
      </div>
    </section>
  )
}
