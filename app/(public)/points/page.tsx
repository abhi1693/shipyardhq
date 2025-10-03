import Link from "next/link"

import { buildPageMetadata } from "@/lib/metadata"
import { adminPath, MEMBER_BASE_PATH } from "@/lib/routes"
import { Button } from "@/components/atoms/button"

const earningRules = [
  {
    title: "Daily login",
    description: "Check in once a day to claim a quick burst of five points.",
    meta: "Cap: 1 per day",
  },
  {
    title: "Give thoughtful feedback",
    description:
      "Upvote products you love and publish reviews. Longer write-ups unlock bonus points for extra detail.",
    meta: "Upvotes: +2 each, Reviews: +10",
  },
  {
    title: "Verify backlinks",
    description:
      "Connect your marketing stack. When Shipyard confirms a backlink from your site you bank a 30-point boost.",
    meta: "One-time per product",
  },
  {
    title: "Maintain streaks",
    description:
      "Nightly jobs audit your activity and add streak bonuses as you keep momentum for consecutive days.",
    meta: "Escalating tiers",
  },
]

const redemptionOptions = [
  {
    title: "Priority placement",
    description:
      "Push your product to the top of browse results for 24 hours and catch builders while they are exploring new tools.",
    cost: "150 points",
  },
  {
    title: "Featured badge & homepage",
    description:
      "Earn premium visibility across Shipyard with the featured hero, homepage carousel, and leaderboard call-outs.",
    cost: "300–500 points",
  },
  {
    title: "Sticky banner",
    description:
      "Lock a persistent ribbon to your product or browse card for 48 hours so visitors see your CTA on every scroll.",
    cost: "200 points",
  },
  {
    title: "Insights & analytics",
    description:
      "Redeem points for advanced dashboards, sentiment insights, and conversion funnels without upgrading a plan.",
    cost: "60–120 points",
  },
  {
    title: "Audience promos",
    description:
      "Reserve newsletter placements to showcase launches, trials, or seasonal offers to the Shipyard community.",
    cost: "350 points",
  },
]

const governanceItems = [
  "Every point mutation flows through a dedicated ledger with audit-ready metadata and idempotent event handling.",
  "Admins can issue manual adjustments or partial refunds while the system replays schedules and inventory checks automatically.",
  "Telemetry events power dashboards to flag anomalies like reciprocal upvotes, balance spikes, or failed placements.",
]

export const metadata = buildPageMetadata({
  title: "Shipyard Points",
  section: "Public",
  description: "Earn Shipyard points for authentic engagement and redeem them for premium placements and insights.",
})

export default function PointsExplainerPage() {
  return (
    <div className="py-16 sm:py-20">
      <section className="mx-auto flex max-w-5xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr,1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-1)]">
              Introducing Shipyard Points
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Turn everyday momentum into premium visibility
            </h1>
            <p className="text-lg text-muted-foreground">
              We built Shipyard Points so builders can earn their way into marquee placements, analytics, and launch fuel by showing up consistently. Track credit, redeem perks, and keep momentum without juggling promo budgets.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={MEMBER_BASE_PATH}>
                <Button size="lg" className="rounded-full">
                  Check your balance
                </Button>
              </Link>
              <Link
                href={adminPath("points", "rules")}
                className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.2] px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] hover:border-[color:var(--brand-1)/0.4]"
              >
                View rulebook
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-[color:var(--brand-1)/0.08] p-6 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Sample balance
                </span>
                <span className="rounded-full bg-[color:var(--brand-1)/0.1] px-3 py-1 text-xs font-semibold text-[color:var(--brand-1)]">
                  Growth tier
                </span>
              </div>
              <p className="text-5xl font-semibold tracking-tight text-slate-900">
                1,420<span className="ml-2 text-lg text-muted-foreground">pts</span>
              </p>
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Recent activity
                </p>
                <ul className="mt-3 space-y-3 text-sm text-slate-700">
                  <li className="flex justify-between">
                    <span>Published review of FlowPilot</span>
                    <span className="font-mono text-[color:var(--brand-1)]">+10</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Maintained 7-day streak</span>
                    <span className="font-mono text-[color:var(--brand-1)]">+8</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Redeemed homepage placement</span>
                    <span className="font-mono text-rose-500">-300</span>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Points are awarded after automated validation, and every adjustment is logged for audit and rollbacks.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Earn points by helping the community grow
            </h2>
            <p className="text-base text-muted-foreground">
              Authentic engagement matters. The programme rewards signal over spam and introduces natural cooldowns, per-product caps, and streak incentives so builders keep contributing for the long run.
            </p>
          </div>
          <div className="grid gap-4">
            {earningRules.map((rule) => (
              <div
                key={rule.title}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {rule.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                    {rule.meta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-slate-900 px-6 py-10 text-slate-50">
          <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                Redeem highlights
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Convert momentum into meaningful surface area
              </h2>
              <p className="text-sm text-slate-300">
                Points unlock the same catalogue Shipyard uses in paid plans: promo placements, deep analytics, and insights. Redeem instantly, schedule for later, or stack multiple rewards for launches.
              </p>
            </div>
            <div className="grid gap-4">
              {redemptionOptions.map((reward) => (
                <div
                  key={reward.title}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{reward.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {reward.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                      {reward.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,1fr]">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Built for transparency and trust
            </h2>
            <p className="text-base text-muted-foreground">
              The points engine shares the same governance Shipyard uses for plan billing. Ledger-backed transactions, anomaly detection, and assisted refunds keep the economy resilient as we scale.
            </p>
            <Link
              href={adminPath("points", "transactions")}
              className="inline-flex items-center text-sm font-semibold text-[color:var(--brand-1)]"
            >
              Explore transaction logs →
            </Link>
          </div>
          <ul className="space-y-4">
            {governanceItems.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 text-sm text-slate-700 shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
