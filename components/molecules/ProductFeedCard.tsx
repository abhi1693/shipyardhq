import Image from "next/image"
import Link from "next/link"

import { ArrowUpRight, Flame, Users } from "lucide-react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import UpvoteSquareButton from "@/components/molecules/UpvoteSquareButton"

const LOGO_SIZE = 60
const numberFormatter = new Intl.NumberFormat()

interface ProductFeedCardProps {
  item: HomepageFeedItem
  className?: string
}

export function ProductFeedCard({ item, className }: ProductFeedCardProps) {
  const cardClasses = cn(
    "group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-5 py-5 shadow-[0_22px_64px_-50px_rgba(7,58,104,0.42)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_84px_-50px_rgba(7,58,104,0.48)] focus-within:outline-none focus-visible:ring-2 focus-visible:ring-[#7F5AF0]/20",
    item.isSponsored &&
      "bg-gradient-to-br from-[#F6F1FF] via-white to-[#F9F5FF] border-[#E0D7FF]",
    className,
  )

  const tagline =
    item.tagline?.trim() ||
    "Discover launch-ready tools from indie makers worldwide."

  const hasBadges = item.badges.length > 0
  const primaryBadge = item.badges[0]
  const secondaryBadges = item.badges.slice(1)
  const watchersCount = Math.max(item.voteCount * 3, 48)
  const formattedWatchers = numberFormatter.format(watchersCount)

  return (
    <article className={cardClasses} data-testid="homepage-feed-card">
      <div className="flex items-start gap-3">
        <Link
          href={productPath(item.slug)}
          className="flex flex-1 items-start gap-3 text-left no-underline"
        >
          <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5F6FA] via-white to-[#EEF1FF] shadow-[0_20px_38px_-34px_rgba(28,35,51,0.45)] ring-1 ring-inset ring-white/70 transition-transform duration-200 group-hover:scale-[1.03]">
            {item.logo ? (
              <Image
                src={item.logo}
                alt={`${item.name} logo`}
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[#1C2333]">
                {item.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="line-clamp-1 text-lg font-semibold leading-tight text-[#11172A] transition-colors group-hover:text-[#020511]">
                {item.name}
              </h3>
              {item.isSponsored ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EAFF] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5B41D9] shadow-[0_16px_28px_-26px_rgba(76,58,195,0.45)]">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  Sponsored
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-[#3B4256]">
              {tagline}
            </p>
            {hasBadges ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5FF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4C5FD5]">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {primaryBadge}
                </span>
                {secondaryBadges.map((badge) => (
                  <span
                    key={`${item.id}-${badge}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E0E7FF] bg-white px-3 py-1 text-[11px] font-medium text-[#48567A]"
                  >
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    {badge}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500">
                Launch-ready
              </span>
            )}
          </div>
        </Link>
        <UpvoteSquareButton
          productId={item.id}
          initialCount={item.voteCount}
          initialUpvoted={item.isVoted}
          title={`Upvote ${item.name}`}
          compact
          className="bg-[#F2F4FF] text-[#1C2333] transition-all hover:bg-[#E6E9FF] group-hover:shadow-[0_20px_48px_-32px_rgba(28,35,51,0.5)] data-[active='true']:bg-[#1C2333] data-[active='true']:text-white"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#3B4256]">
        <Link
          href={
            item.categorySlug
              ? `/browse?category=${encodeURIComponent(item.categorySlug)}`
              : productPath(item.slug)
          }
          className="inline-flex items-center rounded-full border border-[#E1E4F5] bg-[#F7F8FF] px-3 py-1 font-medium transition-colors hover:bg-[#E8ECFF] hover:text-[#1C2333]"
        >
          {item.category ?? "General"}
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[#F8F9FB] px-3 py-1 text-sm font-medium text-[#5B6175]">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {formattedWatchers} builders watching
        </span>
      </div>
    </article>
  )
}

export default ProductFeedCard
