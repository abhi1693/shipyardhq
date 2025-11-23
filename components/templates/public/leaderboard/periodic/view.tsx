import Link from "next/link"

import type { PeriodicLeaderboardPayload } from "@/actions/public/leaderboard/actions"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { IconCalendar, IconSparkles, IconTargetArrow } from "@tabler/icons-react"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { BROWSE_PATH, LEADERBOARD_PATH } from "@/lib/routes"

const TITLES: Record<PeriodicLeaderboardPayload["period"], string> = {
  day: "Product of the Day",
  week: "Product of the Week",
  month: "Product of the Month",
}

export function PeriodicLeaderboardView({
  leaderboard,
}: {
  leaderboard: PeriodicLeaderboardPayload
}) {
  const now = new Date()
  const items = leaderboard.products.map((product) => {
    const base = mapProductCardRecordToBase(product, now)
    return {
      ...base,
      badges: base.badges ?? undefined,
    }
  })

  return (
    <main className="relative isolate bg-[#f5f7fb] pb-20 pt-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:px-8">
        <header className="rounded-3xl border border-border/70 bg-white/95 p-8 shadow-[0_30px_120px_-80px_rgba(12,23,54,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-1)]">
            <Badge
              variant="outline"
              className="flex items-center gap-2 border-[color:var(--brand-1)/0.3] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]"
            >
              <IconSparkles className="h-4 w-4" />
              {TITLES[leaderboard.period]}
            </Badge>
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <IconCalendar className="h-4 w-4" />
              {leaderboard.periodLabel}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              Standouts for {leaderboard.periodLabel}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Every product earning points in this window is ranked in real time.
              Share your launch, drive engagement, and climb the board.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="sm">
              <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Link href={BROWSE_PATH}>Browse products</Link>
            </Button>
            <Badge
              variant="outline"
              className="flex items-center gap-2 border-border/60 text-xs uppercase tracking-[0.18em]"
            >
              <IconTargetArrow className="h-4 w-4 text-[color:var(--brand-1)]" />
              Top {items.length || 0} ranked products
            </Badge>
          </div>
        </header>

        {items.length ? (
          <DirectoryProductList
            items={items}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            metaConfig={{
              type: "rank",
              badgeClassName:
                "border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]",
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-white px-6 py-12 text-center text-muted-foreground">
            <IconSparkles className="h-7 w-7 text-[color:var(--brand-1)]" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                No ranked products yet.
              </p>
              <p className="text-xs text-muted-foreground">
                As soon as products earn points in this window, they will appear here.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Link href={BROWSE_PATH}>Browse products</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
