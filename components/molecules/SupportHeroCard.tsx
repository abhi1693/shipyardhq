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
    <section className="relative overflow-hidden rounded-[32px] bg-white p-6 text-foreground shadow-[0_32px_110px_-70px_rgba(9,60,110,0.35)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_10%,rgba(11,76,135,0.18),transparent_65%)] opacity-75" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
              Support this product
            </span>
            <h3 className="text-lg font-semibold leading-tight">
              Help {productName} climb the leaderboard
            </h3>
          </div>
          <div className="rounded-2xl bg-[color:var(--brand-2)/0.12] p-2 text-[color:var(--brand-2)]">
            <HeartHandshake className="size-5" aria-hidden />
          </div>
        </div>

        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-200/90">
          {supporterCopy}
        </p>

        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800/60">
          <UpvoteSquareButton
            productId={productId}
            initialCount={initialCount}
            initialUpvoted={initialUpvoted}
            title="Community upvotes"
            className="bg-white px-3.5 py-2 text-base font-semibold text-[color:var(--brand-1)] shadow-none ring-1 ring-inset ring-slate-200/60 transition hover:bg-[color:var(--brand-1)/0.05] dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700/60"
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-200/80">
            Upvotes surface this launch to more members.
          </span>
        </div>
      </div>
    </section>
  )
}
