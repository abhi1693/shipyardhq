import Link from "next/link"
import { BarChart3, CheckCircle2, FileText } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

export function FreeLaunchDeliverable() {
  return (
    <div
      role="group"
      aria-label="Included with a free launch"
      className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-[#D7E0EE] bg-white text-left shadow-[0_18px_45px_-32px_rgba(11,28,48,0.45)] sm:mt-10"
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#0051d5] sm:size-12">
          <FileText className="size-5 sm:size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0051d5]">
              Included at $0
            </p>
            <span className="rounded-full bg-[#E9FBEF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#176534]">
              Free
            </span>
          </div>
          <p className="mt-1 text-base font-bold leading-6 text-black sm:text-lg">
            Your launch ships with a public product page
          </p>
          <p className="mt-1 text-xs leading-5 text-[#43474c]">
            Standard card in the homepage launch feed · Browse and matching
            directory results
          </p>
        </div>
      </div>

      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <div className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#0b1c30]">
          <BarChart3
            className="mt-0.5 size-4 shrink-0 text-[#0051d5]"
            aria-hidden
          />
          <span>Track views, visits, visitors, engagement, and upvotes</span>
        </div>
        <p className="mt-1 pl-6 text-[11px] leading-4 text-[#667085] sm:mt-0 sm:pl-0 sm:text-right">
          Upgrade only when you want priority placement.
        </p>
      </div>
    </div>
  )
}

export function PricingFinalCta() {
  return (
    <section id="final-cta" className="bg-white px-4 py-16 sm:px-6 md:py-24">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#0b1c30] px-6 py-12 text-center text-white shadow-[0_30px_80px_-40px_rgba(11,28,48,0.85)] md:px-16 md:py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,81,213,0.55),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(192,255,0,0.16),transparent_34%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C0FF00]">
            Start free. Boost when it counts.
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-10 sm:text-4xl sm:leading-[1.15]">
            Put your product in Shipyard discovery today.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            Your public product page, homepage launch-feed card, directory
            listing, and basic analytics are included at $0. Add a one-time 14-
            or 30-day placement only when you want more visibility.
          </p>
          <Button
            asChild
            className="mt-7 h-auto rounded-lg border-0 bg-[#C0FF00] px-8 py-3 text-base font-bold text-black shadow-none hover:bg-[#C0FF00]/90"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Launch free
            </Link>
          </Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/65">
            <CheckCircle2 className="size-4 text-[#C0FF00]" aria-hidden />
            $0 to publish · One-time boosts never auto-renew
          </p>
        </div>
      </div>
    </section>
  )
}

export function PricingMobileStickyCta() {
  return (
    <aside
      data-pricing-mobile-cta
      aria-label="Start a free Shipyard launch"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#D7E0EE] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-18px_rgba(11,28,48,0.45)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#0b1c30]">
            Public page + analytics
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[#667085]">
            $0 to publish
          </p>
        </div>
        <Button
          asChild
          className="h-10 shrink-0 rounded-lg border-0 bg-black px-5 text-sm font-bold text-white shadow-none hover:bg-black/90"
        >
          <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
            Launch free
          </Link>
        </Button>
      </div>
    </aside>
  )
}
