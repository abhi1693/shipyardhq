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
      "Ranks published products in real time as upvotes roll in. It updates instantly whenever makers cheer on a tool.",
    icon: Trophy,
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
      "The score combines momentum and staying power so you can see who is surging today and who keeps winning fans over time.",
    icon: LineChart,
  },
]

const SCORE_FACTS = [
  {
    heading: "Momentum × loyalty",
    copy: "Every leaderboard score starts with a product’s upvotes this month. We multiply that total by 100, then add the product’s lifetime upvotes. The multiplier keeps fresh campaigns front and center while lifetime fans still matter for tie-breakers.",
  },
  {
    heading: "Real-time recalculation",
    copy: "As soon as a member toggles an upvote, we update Product Analytics and revalidate the leaderboard cache. Makers see their new rank without refreshing the page.",
  },
  {
    heading: "Fair tie handling",
    copy: "If two products land on the same score, the one with more monthly upvotes holds the higher slot. If that’s also tied, we fall back to the earliest product ID — effectively alphabetical by the internal identifier — to keep the list deterministic and transparent.",
  },
]

const RANKING_EVENTS = [
  {
    title: "Daily cadence",
    detail:
      "The public leaderboard is effectively live. It revalidates each time a product gains or loses an upvote.",
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
      "The first three products receive hero cards across the leaderboard and marketing surfaces. That’s why the score multiplier rewards quick momentum.",
    icon: Trophy,
  },
]

const FAQ = [
  {
    q: "Where do upvotes come from?",
    a: "Any signed-in member can cast a single upvote per product. They can toggle it off if they change their mind, and we immediately recalc the score.",
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
                    (monthly upvotes × 100)
                  </span>{" "}
                  + lifetime upvotes
                </p>
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                  Monthly upvotes reset with each calendar month to capture
                  campaign momentum. Lifetime upvotes never reset, rewarding
                  long-term supporters and giving tie-breakers a clear rule.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--brand-1)/0.12] bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Momentum
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Upvotes earned this calendar month multiplied by 100 keep
                      rising launches at the top of the board.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--brand-1)/0.12] bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Loyalty
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Lifetime upvotes make sure products with enduring fans
                      keep their edge when campaigns tie.
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
                    across the homepage, newsletters, and leaderboard hero
                    cards. It’s the fastest way to convert momentum into lasting
                    visibility.
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
                          Appear above the fold on the leaderboard and homepage
                          to catch investors and early adopters scanning the
                          board.
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
                {FAQ.map((item, index) => (
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
