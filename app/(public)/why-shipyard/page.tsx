import Link from "next/link"
import { type ComponentType } from "react"
import {
  IconAnchor,
  IconChartArrows,
  IconClockHour4,
  IconCurrencyDollarOff,
  IconLinkOff,
  IconRocket,
  IconUsersGroup,
} from "@tabler/icons-react"
import PublicContainer from "@/components/layout/PublicContainer"
import { Button } from "@/components/atoms/button"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, PRICING_PATH } from "@/lib/routes"

const HERO_HIGHLIGHTS = [
  {
    title: "Momentum is curated, not gamed",
    description:
      "Our crew reviews every submission and elevates the launches that deliver value—not whoever spams the feed.",
  },
  {
    title: "Launch tooling built in",
    description:
      "Checklists, asset templates, and automated reminders keep your team aligned before, during, and after launch day.",
  },
  {
    title: "Community that converts",
    description:
      "Shipyard’s audience is a tight harbor of builders, investors, and operators actively scouting new products to champion.",
  },
]

const CORE_REASONS = [
  {
    icon: <IconAnchor size={24} />,
    title: "Signal-first discovery",
    description:
      "Human curation plus contextual tagging keep your product docked beside the right audience, not lost in a sea of noise.",
  },
  {
    icon: <IconChartArrows size={24} />,
    title: "Analytics you can act on",
    description:
      "See who is checking out your launch, where they came from, and how engagement shifts across the first 72 hours.",
  },
  {
    icon: <IconUsersGroup size={24} />,
    title: "Crewed amplification",
    description:
      "Dedicated launch specialists help you refine messaging, prep assets, and unlock promotions when you are ready to scale visibility.",
  },
  {
    icon: <IconRocket size={24} />,
    title: "Promotion on your terms",
    description:
      "Upgrade placements instantly—homepage spotlights, newsletter features, leaderboard boosts—without rebuilding your listing.",
  },
]

type MakerReality = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  highlight?: {
    label: string
    href: string
  }
}

const MAKER_REALITIES: MakerReality[] = [
  {
    icon: IconClockHour4,
    title: "Launch on your schedule",
    description:
      "Other directories left us waiting months for a slot or forced a paid fast pass. Shipyard lets you launch the moment you're ready—no queue, no artificial windows.",
  },
  {
    icon: IconCurrencyDollarOff,
    title: "No paywalls to get noticed",
    description:
      "Pay-to-play queues and backlink requirements bury smaller teams. Shipyard keeps placement merit-based—upgrade only when you want extra reach, not to be seen at all.",
  },
  {
    icon: IconLinkOff,
    title: "Analytics you can act on",
    description:
      "We built {link} so your launch insights live beside your listing—referrers, engagement curves, and retention cohorts without extra tracking setup.",
    highlight: {
      label: "Shipyard Analytics",
      href: ANALYTICS_PATH,
    },
  },
]

const COMPARISON_POINTS = [
  {
    feature: "Discovery quality",
    shipyard:
      "Editorial review, daily showcases, and audience segmentation surface launches buyers trust.",
    others:
      "Open-submission feeds, limited context, and high noise floors that bury emerging teams.",
  },
  {
    feature: "Launch preparation",
    shipyard:
      "Structured playbooks, reminder sequences, and collaborative workspaces keep crews in sync.",
    others:
      "DIY planning across docs and chats with no support if a step slips.",
  },
  {
    feature: "Growth intelligence",
    shipyard:
      "Real-time analytics across votes, clicks, referrers, and retention with plan-based depth.",
    others:
      "Basic view counters—no insight into who showed up or why they bounced.",
  },
  {
    feature: "Post-launch momentum",
    shipyard:
      "Ongoing community spotlights, editorial newsletters, and syndication keep traction compounding.",
    others:
      "After launch day your listing sinks down-page with little ongoing amplification.",
  },
]

const MOMENTUM_STEPS = [
  {
    title: "Launch smarter",
    detail:
      "Plug into checklists, video templates, and positioning prompts so every asset you publish earns attention.",
  },
  {
    title: "Convert faster",
    detail:
      "Analytics and messaging feedback loops help you iterate copy, pricing, and onboarding in hours—not weeks.",
  },
  {
    title: "Scale further",
    detail:
      "Unlock premium placements the moment you spot traction, keeping the spotlight on your product while it climbs.",
  },
]

export const metadata = buildPageMetadata({
  title: "Why Shipyard",
  description:
    "List your product where builders, investors, and operators gather. Shipyard pairs curated discovery with analytics and crew support so every launch hits with purpose.",
})

export default function WhyShipyardPage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(115%_85%_at_0%_0%,var(--brand-2)/0.12,transparent_65%),radial-gradient(110%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(80% 110% at 50% 10%, rgba(0, 0, 0, 0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        className="relative"
        innerClassName="relative text-center"
        fillScreen={false}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
          Why Shipyard
        </span>
        <div className="mx-auto mt-8 max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            List where launches become lasting momentum
          </h1>
          <p className="text-lg text-muted-foreground">
            Shipyard is the only launch platform engineered for enduring growth:
            curated discovery, guided preparation, and analytics that keep your
            team focused on what moves the needle.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)]"
          >
            <Link href="/register">List your product</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)] shadow-[0px_18px_40px_-32px_rgba(7,58,104,0.75)]"
          >
            <Link href={PRICING_PATH}>Explore plans</Link>
          </Button>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {HERO_HIGHLIGHTS.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/80 p-6 text-left shadow-[0px_22px_50px_-38px_rgba(7,58,104,0.65)] backdrop-blur"
            >
              <h3 className="text-base font-semibold text-foreground">
                {highlight.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {highlight.description}
              </p>
            </div>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="space-y-12"
        fillScreen={false}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Designed to outpace every other listing platform
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every Shipyard workflow points toward traction: get discovered by
            the right audience, understand what resonates, and amplify momentum
            when it matters most.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {CORE_REASONS.map((reason) => (
            <div
              key={reason.title}
              className="rounded-2xl border border-[color:var(--brand-1)/0.16] bg-background/85 p-6 shadow-[0px_22px_60px_-45px_rgba(7,58,104,0.75)] backdrop-blur"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--brand-2)/0.14] text-[color:var(--brand-2)]">
                  {reason.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {reason.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="space-y-12"
        fillScreen={false}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why makers switch to Shipyard
          </h2>
          <p className="mt-4 text-muted-foreground">
            These are the roadblocks we hit on other launch platforms—and the
            reasons Shipyard keeps the path to launch clear.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {MAKER_REALITIES.map((item) => {
            const Icon = item.icon
            const segments = item.highlight
              ? item.description.split("{link}")
              : [item.description]

            return (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-2xl border border-[color:var(--brand-1)/0.16] bg-background/85 p-6 text-left shadow-[0px_22px_50px_-42px_rgba(7,58,104,0.72)] backdrop-blur"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--brand-2)/0.14] text-[color:var(--brand-2)]">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.highlight ? (
                      <>
                        {segments[0] ?? ""}
                        <Link
                          href={item.highlight.href}
                          className="font-semibold text-[color:var(--brand-1)] underline-offset-4 hover:underline"
                        >
                          {item.highlight.label}
                        </Link>
                        {segments[1] ?? ""}
                      </>
                    ) : (
                      segments[0]
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="space-y-10"
        fillScreen={false}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How Shipyard stacks up
          </h2>
          <p className="mt-4 text-muted-foreground">
            From the first teaser to the post-launch surge, Shipyard delivers
            the guidance, audience, and tooling other directories skip.
          </p>
        </div>
        <div className="divide-y divide-[color:var(--brand-1)/0.12] overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/85 shadow-[0px_30px_70px_-50px_rgba(7,58,104,0.75)] backdrop-blur">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr] gap-6 px-6 py-5 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-2)] sm:grid">
            <span>Focus</span>
            <span>Shipyard</span>
            <span>Other directories</span>
          </div>
          {COMPARISON_POINTS.map((row) => (
            <div
              key={row.feature}
              className="grid gap-6 px-6 py-6 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-start"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-1)]">
                  {row.feature}
                </p>
              </div>
              <div className="rounded-xl bg-[color:var(--brand-2)/0.12] p-4 text-sm font-semibold text-[color:var(--brand-1)] shadow-[0px_18px_40px_-32px_rgba(7,58,104,0.65)] sm:bg-transparent sm:p-0 sm:shadow-none sm:text-base">
                {row.shipyard}
              </div>
              <div className="text-sm text-muted-foreground sm:text-base">
                {row.others}
              </div>
            </div>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="space-y-12"
        fillScreen={false}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A launch loop that keeps compounding
          </h2>
          <p className="mt-4 text-muted-foreground">
            The Shipyard flywheel gives you clarity at every stage—before
            launch, while the spotlight shines, and long after the initial wave.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {MOMENTUM_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="flex flex-col rounded-2xl border border-[color:var(--brand-1)/0.16] bg-background/85 p-6 text-left shadow-[0px_22px_50px_-40px_rgba(7,58,104,0.7)] backdrop-blur"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--brand-2)/0.12] text-sm font-semibold text-[color:var(--brand-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        className="relative"
        innerClassName="relative"
        fillScreen={false}
      >
        <div className="relative mx-auto flex max-w-4xl flex-col gap-10 overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.25] bg-background/95 px-6 py-12 text-center shadow-[0px_50px_140px_-90px_rgba(7,58,104,0.85)] sm:px-12">
          <div className="space-y-5">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
              Stay the course
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Ready to chart your next voyage?
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              Publish once, keep momentum rolling, and promote on your
              terms—from first launch to repeat features.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="gap-2 shadow-[0px_25px_55px_-35px_rgba(7,58,104,0.85)]"
              >
                Start listing today
              </Button>
            </Link>
            <Link
              href={PRICING_PATH}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-background/80 px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] shadow-[0px_20px_45px_-32px_rgba(7,58,104,0.75)] transition-colors hover:bg-[color:var(--brand-1)/0.06]"
            >
              See placement options
            </Link>
          </div>
        </div>
      </PublicContainer>
    </main>
  )
}
