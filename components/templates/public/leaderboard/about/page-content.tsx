import Link from "next/link"
import {
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  RotateCw,
  Scale,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { Image } from "@/components/atoms/image"
import {
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
} from "@/lib/routes"

const SCORE_INPUTS = [
  {
    title: "Weighted Inputs",
    detail:
      "Upvotes from active Shipyard members carry the strongest weight in the ranking model.",
    icon: BarChart3,
  },
  {
    title: "No Paid Shortcuts",
    detail:
      "We filter bots and synthetic traffic with velocity checks before it can affect rank.",
    icon: ShieldCheck,
  },
  {
    title: "Real-time Logic",
    detail:
      "Leaderboard ranks recalculate as votes and product traffic events are recorded.",
    icon: RotateCw,
  },
  {
    title: "Fair Tie Handling",
    detail:
      "Ties are broken by upvotes, unique visitors, page views, and deterministic product order.",
    icon: Scale,
  },
]

const RANKING_CADENCE = [
  {
    title: "Daily Momentum",
    detail:
      "The trending view highlights products gaining the most velocity in the current window.",
    icon: Clock,
  },
  {
    title: "Monthly Reset",
    detail:
      "Main scores reset on the first UTC day of every month to keep competition fresh.",
    icon: RefreshCw,
  },
  {
    title: "Top Placement",
    detail:
      "Top monthly ships receive permanent badges and featured placement opportunities.",
    icon: Award,
  },
]

const BOOST_FEATURES = [
  "Sponsored Featured slot for high-intent discovery",
  "Category-specific Spotlight Bundle",
  "Direct access to Shipyard investor and builder surfaces",
]

export const LEADERBOARD_FAQ = [
  {
    q: "How do I enter my product?",
    a: "Use the Ship Product flow to submit a published product with a live URL. Once approved, the product can receive traffic, upvotes, and leaderboard points.",
  },
  {
    q: "Can I lose my ranking?",
    a: "Yes. Rankings update as the month progresses, so products can move down if their momentum slows or if another launch earns stronger community and traffic signals.",
  },
  {
    q: "What are the rewards for ranking #1?",
    a: "Top products receive leaderboard recognition, permanent badges, and eligibility for featured Shipyard placements and community callouts.",
  },
]

function MetricCard({
  title,
  detail,
  icon: Icon,
}: {
  title: string
  detail: string
  icon: typeof BarChart3
}) {
  return (
    <Card className="rounded-lg border-[#E2E8F0] bg-white p-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md">
      <CardContent className="p-6">
        <Icon className="mb-4 size-8 text-[#0051d5]" aria-hidden />
        <h3 className="mb-2 text-[18px] font-semibold leading-6 text-[#0b1c30]">
          {title}
        </h3>
        <p className="text-[14px] leading-5 text-[#43474c]">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CadenceItem({
  title,
  detail,
  icon: Icon,
}: {
  title: string
  detail: string
  icon: typeof Clock
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#061d31] text-white">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <h4 className="mb-2 text-[18px] font-semibold leading-6 text-[#0b1c30]">
          {title}
        </h4>
        <p className="text-[14px] leading-5 text-[#43474c]">{detail}</p>
      </div>
    </div>
  )
}

export function LeaderboardGuidePageContent() {
  return (
    <main className="bg-[#f8f9ff] px-6 pb-16 text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px]">
        <section className="mx-auto max-w-3xl py-16 text-center md:py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#d3e4fe] px-3 py-1 text-[#0051d5]">
            <Star className="size-[18px] fill-current" aria-hidden />
            <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em]">
              Shipyard Pro Performance
            </span>
          </div>
          <h1 className="mb-6 text-[32px] font-bold leading-10 tracking-[-0.02em] text-black">
            The Leaderboard Playbook
          </h1>
          <p className="mb-10 text-[16px] leading-6 text-[#43474c]">
            Shipyard HQ&apos;s Leaderboard is the definitive engine for product
            discovery. We&apos;ve designed a high-performance system that
            rewards quality, consistency, and genuine community engagement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              className="h-12 rounded-lg border-0 bg-black px-8 text-[18px] font-semibold leading-6 text-white shadow-none hover:bg-black/90"
            >
              <Link href={LEADERBOARD_PATH}>Enter Leaderboard</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-lg border-[#74777d] bg-transparent px-8 text-[18px] font-semibold leading-6 text-[#0b1c30] shadow-none hover:bg-[#eff4ff]"
            >
              <a href="#rules">View Rules</a>
            </Button>
          </div>
        </section>

        <section id="rules" className="mb-6">
          <div className="relative mb-6 overflow-hidden rounded-xl border border-[#061d31] bg-[linear-gradient(135deg,#061d31_0%,#000000_100%)] p-6 text-white shadow-[0_0_20px_rgba(192,255,0,0.1)] md:p-10">
            <div className="relative z-10">
              <h2 className="mb-4 text-[12px] font-semibold uppercase leading-4 tracking-widest text-[#C0FF00]">
                The Performance Algorithm
              </h2>
              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                <div className="text-left">
                  <p className="mb-2 text-[28px] font-bold leading-10 tracking-[-0.02em] md:text-[32px]">
                    Score ={" "}
                    <span className="text-[#C0FF00]">(U x 10)</span> +{" "}
                    <span className="text-[#dbe1ff]">(V x 3)</span> +{" "}
                    <span className="text-[#c4c6cd]">P</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-white/70">
                    <span>U = Monthly Upvotes</span>
                    <span>V = Unique Visitors</span>
                    <span>P = Page Views</span>
                  </div>
                </div>
                <div className="hidden h-24 w-px bg-[#71869e] lg:block" />
                <div className="text-center md:text-right">
                  <p className="max-w-xs text-[14px] italic leading-5 text-[#71869e]">
                    &quot;Our formula prioritizes intentional community support
                    over passive traffic spikes.&quot;
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 size-64 bg-[#0051d5] opacity-10 blur-[100px]" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SCORE_INPUTS.map((item) => (
              <MetricCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="border-t border-[#E2E8F0] py-16">
          <h2 className="mb-10 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-[#0b1c30]">
            Ranking Cadence
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {RANKING_CADENCE.map((item) => (
              <CadenceItem key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="mb-6 flex flex-col items-center gap-12 rounded-xl border border-[#c4c6cd] bg-[#eff4ff] p-6 md:flex-row md:p-8">
          <div className="w-full md:w-1/2">
            <h2 className="mb-4 text-[32px] font-bold leading-10 tracking-[-0.02em] text-[#0b1c30]">
              Ready to climb higher?
            </h2>
            <p className="mb-6 text-[16px] leading-6 text-[#43474c]">
              Sometimes organic growth needs a catalyst. Boost your visibility
              with curated placements designed for high conversion.
            </p>
            <ul className="mb-8 space-y-4">
              {BOOST_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle className="size-5 text-[#16a34a]" aria-hidden />
                  <span className="text-[14px] leading-5">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                className="h-10 rounded-lg border-0 bg-[#0051d5] px-6 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-white shadow-none hover:bg-[#0051d5]/90"
              >
                <Link href={PRICING_PATH}>Get Spotlight</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-lg border-[#E2E8F0] bg-white px-6 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#0b1c30] shadow-none hover:bg-[#F8FAFC]"
              >
                <Link href={PRICING_PATH}>Compare Plans</Link>
              </Button>
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#c4c6cd] bg-[#f8f9ff] shadow-lg md:w-1/2">
            <Image
              src="/analytics-1.png"
              alt="Shipyard leaderboard interface"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-xs rounded-lg border border-[#E2E8F0] bg-white p-6 text-center shadow-xl">
                <div className="mb-2 inline-block rounded bg-[#F97316]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#F97316]">
                  Pro Tip
                </div>
                <p className="text-[14px] font-semibold leading-5">
                  &quot;Spotlighted ships see stronger conversion from builders
                  already scanning the leaderboard.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl py-16">
          <h2 className="mb-8 text-center text-[24px] font-semibold leading-8 tracking-[-0.01em] text-[#0b1c30]">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-1">
            {LEADERBOARD_FAQ.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`faq-${index}`}
                className="border-b border-[#E2E8F0]"
              >
                <AccordionTrigger className="rounded-none px-0 py-4 text-[18px] font-semibold leading-6 text-[#0b1c30] hover:bg-transparent hover:text-[#0051d5] hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-4 pt-0">
                  <p className="text-[14px] leading-5 text-[#43474c]">
                    {item.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-[#061d31] p-4 text-white">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="size-2 animate-pulse rounded-full bg-[#C0FF00]" />
              <p className="text-[12px] font-semibold uppercase leading-4 tracking-wide">
                Live Event: This month&apos;s leaderboard sprint is active.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href={LEADERBOARD_PATH}
                className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] transition-colors hover:text-[#C0FF00]"
              >
                View Live Rankings
              </Link>
              <Button
                asChild
                className="h-9 rounded bg-[#C0FF00] px-4 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-black shadow-none hover:bg-white"
              >
                <Link href={MEMBER_PRODUCTS_ADD_PATH}>
                  <Zap className="size-4" aria-hidden />
                  Join Now
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
