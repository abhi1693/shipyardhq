import Link from "next/link"
import { type ComponentType } from "react"
import {
  IconAnchor,
  IconChartArrows,
  IconChecklist,
  IconClockHour4,
  IconCurrencyDollarOff,
  IconLinkOff,
  IconSparkles,
  IconUsersGroup,
} from "@tabler/icons-react"

import { Button } from "@/components/atoms/button"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ANALYTICS_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"

type IconComponent = ComponentType<{ className?: string; size?: number }>

type FeatureCard = {
  icon: IconComponent
  title: string
  description: string
}

const HERO_FEATURES: FeatureCard[] = [
  {
    icon: IconChartArrows,
    title: "Momentum is filtered, not gamed",
    description:
      "Discovery filters and quality checks keep default feeds focused on launches with clear value, not whoever spams the feed.",
  },
  {
    icon: IconChecklist,
    title: "Launch tooling built in",
    description:
      "Checklists, asset templates, and automated reminders keep your team aligned before, during, and after launch day.",
  },
  {
    icon: IconUsersGroup,
    title: "Community that converts",
    description:
      "Shipyard's audience is a focused community of builders, investors, and operators actively looking for new products to champion.",
  },
]

const CORE_REASONS: FeatureCard[] = [
  {
    icon: IconAnchor,
    title: "Signal-first discovery",
    description:
      "Quality filters and contextual tagging keep your product in front of the right audience, not lost in a sea of noise.",
  },
  {
    icon: IconChartArrows,
    title: "Analytics you can act on",
    description:
      "Pair real-time analytics with audience context so you know which message, channel, or offer to ship next.",
  },
  {
    icon: IconUsersGroup,
    title: "Launch specialists on call",
    description:
      "Dedicated launch specialists help you refine messaging, prep assets, and unlock promotions when you are ready to scale visibility.",
  },
  {
    icon: IconSparkles,
    title: "Promotion on your terms",
    description:
      "Upgrade placements instantly with sponsored placements and leaderboard boosts without rebuilding your listing.",
  },
]

type MakerSwitchReason = {
  icon: IconComponent
  title: string
  description: string
  highlight?: {
    label: string
    href: string
  }
}

const MAKER_SWITCH_REASONS: MakerSwitchReason[] = [
  {
    icon: IconClockHour4,
    title: "Launch on your schedule",
    description:
      "Other directories left us waiting months for a slot or forced a paid fast pass. Shipyard lets you launch the moment you're ready with no queue and no artificial windows.",
  },
  {
    icon: IconCurrencyDollarOff,
    title: "No paywalls to get noticed",
    description:
      "Pay-to-play queues bury smaller teams. Shipyard keeps placement merit-based, so you upgrade only when you want extra reach, not to be seen at all.",
  },
  {
    icon: IconLinkOff,
    title: "Analytics without extra tooling",
    description:
      "We built {link} so your launch intelligence lives beside your listing: traffic, AI crawler attention, and discovery trends without another dashboard.",
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
      "Quality filters, daily showcases, and audience segmentation surface launches buyers trust.",
    others:
      "Open-submission feeds, limited context, and high noise floors that bury emerging teams.",
  },
  {
    feature: "Launch preparation",
    shipyard:
      "Structured playbooks, reminder sequences, and collaborative workspaces keep teams in sync.",
    others:
      "DIY planning across docs and chats with no support if a step slips.",
  },
  {
    feature: "Growth intelligence",
    shipyard:
      "Real-time analytics with campaign and referral context so you can see who showed up, what converted, and what to tweak next.",
    others:
      "Basic view counters with no context on who showed up, why they bounced, or what to do about it.",
  },
  {
    feature: "Post-launch momentum",
    shipyard:
      "Ongoing community spotlights and syndication keep traction compounding.",
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
      "Analytics feedback loops help you iterate copy, pricing, and onboarding in hours, not weeks.",
  },
  {
    title: "Scale further",
    detail:
      "Analytics highlights when to amplify reach, unlock premium placements the moment momentum spikes, and keep the spotlight on your product.",
  },
]

const PAGE_TITLE = "Why Shipyard"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Launch your app, SaaS tool, API, or startup product on ${BRAND_NAME} with focused discovery, rankings, analytics, and promotion tools.`,
  canonical: WHY_SHIPYARD_PATH,
})

export default function WhyShipyardPage() {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="why-shipyard"
        webPage={{ path: WHY_SHIPYARD_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: WHY_SHIPYARD_PATH },
          ],
        }}
      />

      <div className="bg-[#f8fafc] text-[#0b1c30]">
        <section className="mx-auto max-w-[1200px] px-4 py-20 text-center md:px-6 md:py-24">
          <span className="inline-flex rounded-full bg-[#0051d5]/10 px-4 py-1 text-xs font-semibold uppercase text-[#0051d5]">
            Why Shipyard
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight text-black md:text-6xl">
            List where launches become lasting momentum.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#43474c] md:text-lg">
            Shipyard is a launch platform for enduring growth: focused
            discovery, guided preparation, and analytics that keep your team
            focused on what moves the needle.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-lg px-8">
              <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                List your product
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-lg border-[#e2e8f0] bg-white px-8 text-black hover:bg-[#f8fafc]"
            >
              <Link href={PRICING_PATH}>Explore plans</Link>
            </Button>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HERO_FEATURES.map((feature) => (
              <FeatureTile key={feature.title} feature={feature} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <SectionHeader
            title="Designed to outpace every other listing platform"
            description="Every Shipyard workflow points toward traction: get discovered by the right audience, understand what resonates, and amplify momentum when it matters most."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {CORE_REASONS.map((reason) => (
              <ReasonTile key={reason.title} reason={reason} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <div className="rounded-xl bg-black px-6 py-12 text-white md:px-12 md:py-16">
            <SectionHeader
              title="Why makers switch to Shipyard"
              description="These are the roadblocks we hit on other launch platforms, and the reasons Shipyard keeps the path to launch clear."
              inverted
            />
            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {MAKER_SWITCH_REASONS.map((reason) => (
                <MakerReasonTile key={reason.title} reason={reason} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <SectionHeader
            title="How Shipyard stacks up"
            description="From the first teaser to the post-launch surge, Shipyard delivers the guidance, audience, and tooling other directories skip."
          />
          <div className="mt-12 overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <TableHead>Focus</TableHead>
                  <TableHead className="text-[#0051d5]">Shipyard</TableHead>
                  <TableHead>Other directories</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {COMPARISON_POINTS.map((row) => (
                  <tr key={row.feature}>
                    <td className="p-6 text-xs font-semibold uppercase text-[#43474c]">
                      {row.feature}
                    </td>
                    <td className="p-6 text-sm font-bold leading-6 text-[#0051d5]">
                      {row.shipyard}
                    </td>
                    <td className="p-6 text-sm leading-6 text-[#43474c]">
                      {row.others}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <SectionHeader
            title="A launch loop that keeps compounding"
            description="The Shipyard flywheel gives you clarity at every stage: before launch, while the spotlight shines, and long after the initial wave."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {MOMENTUM_STEPS.map((step, index) => (
              <MomentumTile key={step.title} step={step} index={index} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 pb-24 md:px-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white px-6 py-12 text-center shadow-sm md:px-12 md:py-16">
            <span className="inline-flex rounded-full border border-[#0051d5]/20 px-4 py-1 text-xs font-semibold uppercase text-[#0051d5]">
              Keep momentum
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight text-black md:text-5xl">
              Ready to plan your next launch?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#43474c] md:text-lg">
              Publish once, keep momentum rolling, and promote on your terms
              from first launch to repeat features.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-lg px-10">
                <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                  Start listing today
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-lg border-[#e2e8f0] bg-white px-10 text-black hover:bg-[#f8fafc]"
              >
                <Link href={PRICING_PATH}>See placement options</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function SectionHeader({
  title,
  description,
  inverted = false,
}: {
  title: string
  description: string
  inverted?: boolean
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2
        className={cn(
          "text-3xl font-bold leading-tight md:text-4xl",
          inverted ? "text-white" : "text-black",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-4 text-base leading-7 md:text-lg",
          inverted ? "text-[#b3c8e3]" : "text-[#43474c]",
        )}
      >
        {description}
      </p>
    </div>
  )
}

function FeatureTile({ feature }: { feature: FeatureCard }) {
  const Icon = feature.icon

  return (
    <article className="group rounded-lg border border-[#e2e8f0] bg-white p-8 text-left shadow-sm transition hover:border-[#0051d5] hover:shadow-md">
      <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-[#eff6ff] text-[#0051d5] transition group-hover:bg-[#0051d5] group-hover:text-white">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold leading-6 text-black">
        {feature.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[#43474c]">
        {feature.description}
      </p>
    </article>
  )
}

function ReasonTile({ reason }: { reason: FeatureCard }) {
  const Icon = reason.icon

  return (
    <article className="flex gap-6 rounded-lg border border-[#e2e8f0] bg-white p-8 transition hover:border-[#0051d5]">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#0051d5]">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <h3 className="text-lg font-semibold leading-6 text-black">
          {reason.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#43474c]">
          {reason.description}
        </p>
      </div>
    </article>
  )
}

function MakerReasonTile({ reason }: { reason: MakerSwitchReason }) {
  const Icon = reason.icon
  const segments = reason.highlight
    ? reason.description.split("{link}")
    : [reason.description]

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.06] p-8 transition hover:bg-white/[0.1]">
      <Icon className="h-10 w-10 text-[#b3c8e3]" aria-hidden />
      <h3 className="mt-6 text-lg font-semibold leading-6 text-white">
        {reason.title}
      </h3>
      <p className="mt-4 text-sm leading-6 text-[#b3c8e3]">
        {reason.highlight ? (
          <>
            {segments[0] ?? ""}
            <Link
              href={reason.highlight.href}
              className="font-bold text-[#d0e4ff] underline-offset-4 hover:underline"
            >
              {reason.highlight.label}
            </Link>
            {segments[1] ?? ""}
          </>
        ) : (
          segments[0]
        )}
      </p>
    </article>
  )
}

function TableHead({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "border-b border-[#e2e8f0] p-6 text-left text-xs font-semibold uppercase text-[#43474c]",
        className,
      )}
    >
      {children}
    </th>
  )
}

function MomentumTile({
  step,
  index,
}: {
  step: (typeof MOMENTUM_STEPS)[number]
  index: number
}) {
  return (
    <article className="relative rounded-lg border border-[#e2e8f0] bg-white p-8 transition hover:border-[#0051d5]">
      <span className="absolute -top-6 left-4 select-none text-7xl font-black text-[#0051d5]/10">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="relative">
        <h3 className="text-lg font-semibold leading-6 text-black">
          {step.title}
        </h3>
        <p className="mt-4 text-sm leading-6 text-[#43474c]">{step.detail}</p>
      </div>
    </article>
  )
}
