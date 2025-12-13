import Link from "next/link"

import { Button } from "@/components/atoms/button"
import {
  LEADERBOARD_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_GUIDE_PATH,
  PRICING_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { CalendarRange, LineChart, Sparkles, Trophy } from "lucide-react"

const HERO_HIGHLIGHTS = [
  {
    title: "Live leaderboard",
    detail:
      "Ranks published products as new traffic and upvotes land. Scores refresh whenever we log visits or votes for a listing.",
    icon: Trophy,
  },
  {
    title: "Visibility accelerator",
    detail:
      "Revenue verified products rank higher by default. Products without verified revenue are ranked lower.",
    icon: Sparkles,
  },
  {
    title: "Monthly rankings",
    detail:
      "Resets on the first UTC day each month to spotlight fresh launches. Historical snapshots live in the monthly archive.",
    icon: CalendarRange,
  },
  {
    title: "Transparent scoring",
    detail:
      "Weights monthly upvotes, unique visitors, and page views (10:3:1) so you can see which products are converting attention into fans.",
    icon: LineChart,
  },
]

const SCORE_FACTS = [
  {
    heading: "Weighted monthly inputs",
    copy: "Scores are recalculated off three signals inside the current calendar month: upvotes × 10, unique visitors × 3, and page views × 1. Traffic comes from product page views and unique visitors, and we only consider published listings.",
  },
  {
    heading: "Revenue verification boosts visibility",
    copy: "After we calculate base points, revenue verified products receive a visibility boost and are ranked above products without verified revenue by default.",
  },
  {
    heading: "Real-time recalculation",
    copy: "When a member upvotes or we capture a product traffic event, we rerun the leaderboard window up to that moment and revalidate caches so ranks reflect the latest activity.",
  },
  {
    heading: "Fair tie handling",
    copy: "If scores match, we compare monthly upvotes first, then unique visitors, then page views. If everything is still tied, we sort by product ID to keep the board deterministic.",
  },
]

const RANKING_EVENTS = [
  {
    title: "Daily cadence",
    detail:
      "The public leaderboard is effectively live. It revalidates each time a product gains an upvote or logs new traffic.",
    icon: Sparkles,
  },
  {
    title: "Monthly reset",
    detail:
      "On day one of every month we archive the previous standings, seed monthly placements, and clear the slate so new launches can shine.",
    icon: CalendarRange,
  },
  {
    title: "Top placement cards",
    detail:
      "The first three products receive hero cards across the leaderboard and marketing surfaces. That’s why the weighting favors quick momentum.",
    icon: Trophy,
  },
]

export const LEADERBOARD_FAQ = [
  {
    q: "Where do upvotes come from?",
    a: "Any signed-in member can cast a single upvote per product. Votes are permanent; monthly tallies only increase as new fans arrive, and we refresh scores right after each new vote.",
  },
  {
    q: "Do private drafts count?",
    a: "Draft listings stay invisible and never influence the leaderboard. Only published products accumulate votes and appear in the ranks.",
  },
  {
    q: "How can I improve my position?",
    a: "Keep your listing current, re-engage your audience with updates, and encourage happy users to upvote. Featuring your product unlocks additional spotlight placements.",
  },
]

export function LeaderboardGuidePageContent() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="py-24 lg:py-28">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="relative mx-auto flex flex-col gap-12 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.4] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2-text,#0a5678)] shadow-[0_18px_40px_-30px_rgba(7,58,104,0.45)] backdrop-blur">
                Leaderboard playbook
              </span>
              <h1 className="bg-gradient-to-r from-[color:var(--brand-1)] via-[color:var(--brand-2)] to-[color:var(--brand-3)] bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
                Master the scoring system that spotlights ShipYardHQ builders.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Learn how live rankings, monthly resets, and our score formula
                work together so you can plan launches that climb the
                rankings—and stay there.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="shadow-[0_24px_60px_-35px_rgba(7,58,104,0.55)]"
                >
                  <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)] shadow-[0_20px_50px_-32px_rgba(7,58,104,0.65)]"
                >
                  <Link href={LEADERBOARD_MONTHLY_PATH}>
                    Browse monthly champions
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {HERO_HIGHLIGHTS.map(({ title, detail, icon: Icon }) => (
                <div
                  key={title}
                  className="group relative overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.12] bg-white/90 p-6 shadow-[0_30px_70px_-40px_rgba(7,58,104,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-36px_rgba(7,78,134,0.65)]"
                >
                  <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_100%_0%,var(--brand-2)/0.14,transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start gap-4">
                    {Icon ? (
                      <span className="rounded-2xl border border-[color:var(--brand-1)/0.15] bg-[color:var(--brand-1)/0.08] p-3 text-[color:var(--brand-1)]">
                        <Icon className="h-5 w-5" />
                      </span>
                    ) : null}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-1)]">
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[32px]">
                The score formula
              </h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                ShipYardHQ balances short-term hype with long-term love. Use
                this simple formula to explain your position to teammates and
                investors.
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.18] bg-white/95 p-8 shadow-[0_32px_90px_-48px_rgba(7,78,134,0.6)] backdrop-blur">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_100%_-10%,var(--brand-2)/0.18,transparent_70%)]" />
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
                  Score calculation
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                  Score ={" "}
                  <span className="text-[color:var(--brand-1)]">
                    (monthly upvotes × 10)
                  </span>{" "}
                  + (unique visitors × 3) + monthly page views
                </p>
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                  All inputs reset on the first UTC day of the month. Upvotes
                  are permanent and counted once per member, so this month’s
                  score only rises as new fans arrive. Traffic comes from page
                  views and unique visitors for each product page.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Revenue verified products rank higher by default. Products
                  without verified revenue are ranked lower.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--brand-1)/0.12] bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Upvotes lead
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Each new upvote this month adds 10 points, making
                      community enthusiasm the strongest driver of rank.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--brand-1)/0.12] bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Traffic keeps pace
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Unique visitors (×3) and page views (×1) capture ongoing
                      discovery, rewarding listings that convert attention into
                      upvotes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {SCORE_FACTS.map((fact, index) => (
                  <div
                    key={fact.heading}
                    className={cn(
                      "rounded-3xl border border-[color:var(--brand-1)/0.12] bg-white/92 p-6 shadow-[0_24px_60px_-42px_rgba(7,58,104,0.55)] backdrop-blur transition-transform duration-200 hover:-translate-y-1",
                      index === 0 &&
                        "bg-[linear-gradient(135deg,rgba(7,78,134,0.08),rgba(7,78,134,0.02))]",
                    )}
                  >
                    <h3 className="text-base font-semibold text-slate-900">
                      {fact.heading}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {fact.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[32px]">
                Ranking cadence
              </h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                Scores shift frequently. Here’s what triggers an update and how
                to plan around each event.
              </p>
            </div>

            <div className="relative grid gap-6 lg:grid-cols-3">
              <div className="pointer-events-none absolute left-1/2 top-10 hidden h-[1px] w-full -translate-x-1/2 bg-[radial-gradient(circle,var(--brand-1)/0.3,transparent_70%)] lg:block" />
              {RANKING_EVENTS.map(({ title, detail, icon: Icon }, index) => (
                <div
                  key={title}
                  className={cn(
                    "relative flex h-full flex-col gap-3 rounded-3xl border border-[color:var(--brand-1)/0.12] bg-white/92 p-6 shadow-[0_28px_70px_-46px_rgba(7,78,134,0.6)] backdrop-blur transition-transform duration-200 hover:-translate-y-1",
                    index === 1 &&
                      "bg-[linear-gradient(135deg,rgba(24,113,181,0.08),rgba(7,78,134,0.02))]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {Icon ? (
                      <span className="rounded-2xl border border-[color:var(--brand-1)/0.15] bg-[color:var(--brand-1)/0.08] p-3 text-[color:var(--brand-1)]">
                        <Icon className="h-5 w-5" />
                      </span>
                    ) : null}
                    <h3 className="text-base font-semibold text-slate-900">
                      {title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.2] bg-white/95 shadow-[0_34px_90px_-48px_rgba(7,78,134,0.58)]">
              <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
                <div className="relative p-8 md:p-10">
                  <div className="absolute inset-0 -z-10 bg-[radial-gradient(130%_130%_at_20%_-20%,var(--brand-2)/0.16,transparent_70%)]" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.2] bg-background/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
                    Feature boost
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                    Ready to climb higher?
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Featured placements keep your product in the spotlight
                    across sponsored placements, newsletters, and leaderboard
                    hero cards. It’s the fastest way to convert momentum into
                    lasting visibility.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.25] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Lock in hero visibility
                        </p>
                        <p className="text-muted-foreground">
                          Appear above the fold on the leaderboard and in
                          sponsored placements to catch investors and early
                          adopters scanning the board.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.25] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Convert new fans faster
                        </p>
                        <p className="text-muted-foreground">
                          Featured campaigns come with tailored copy support and
                          email callouts to turn curiosity into upvotes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col justify-between border-t border-[color:var(--brand-1)/0.08] bg-[linear-gradient(135deg,rgba(24,113,181,0.1),rgba(7,78,134,0.05))] p-8 md:border-l md:border-t-0">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Spotlight bundle
                    </p>
                    <h4 className="mt-3 text-xl font-semibold text-slate-900">
                      Boost the launch you care about most
                    </h4>
                    <ul className="mt-4 space-y-3 text-sm text-[color:var(--brand-1)]">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--brand-1)]" />
                        Homepage hero card rotation for your product
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--brand-1)]" />
                        Newsletter and social shout-outs to the community
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--brand-1)]" />
                        Priority cache updates so your score shifts instantly
                      </li>
                    </ul>
                  </div>
                  <div className="mt-6 flex flex-col items-stretch gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="w-full shadow-[0_24px_70px_-44px_rgba(7,58,104,0.65)]"
                    >
                      <Link href={PRICING_PATH}>Compare feature boosts</Link>
                    </Button>
                    <Link
                      href={LEADERBOARD_GUIDE_PATH}
                      className="text-sm font-medium text-[color:var(--brand-1)] underline-offset-4 hover:underline"
                    >
                      Review the scoring guide
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[32px]">
                  Frequently asked questions
                </h2>
                <p className="text-base text-muted-foreground md:text-lg">
                  Still not sure how the leaderboard operates? Start here or
                  reply to any ShipYardHQ email and our team will put together a
                  personalized walkthrough.
                </p>
                <div className="hidden h-full w-px rounded-full bg-[color:var(--brand-1)/0.12] md:block" />
              </div>
              <div className="space-y-4">
                {LEADERBOARD_FAQ.map((item, index) => (
                  <div
                    key={item.q}
                    className={cn(
                      "rounded-3xl border border-[color:var(--brand-1)/0.12] bg-white/92 p-6 shadow-[0_24px_60px_-44px_rgba(7,78,134,0.45)] backdrop-blur transition-transform duration-200 hover:-translate-y-1",
                      index === 0 &&
                        "bg-[linear-gradient(135deg,rgba(7,78,134,0.08),rgba(7,78,134,0.02))]",
                    )}
                  >
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.q}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
