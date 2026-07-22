import Link from "next/link"
import { type ComponentType } from "react"
import {
  IconAnchor,
  IconChartArrows,
  IconChecklist,
  IconClockHour4,
  IconCurrencyDollarOff,
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
    icon: IconCurrencyDollarOff,
    title: "Start with a free listing",
    description:
      "Publish an app, SaaS tool, API, AI product, or startup without paying for a standard listing.",
  },
  {
    icon: IconAnchor,
    title: "Add a direct website link",
    description:
      "Eligible paid plans give interested visitors a direct path from your permanent Shipyard product page to your website.",
  },
  {
    icon: IconChartArrows,
    title: "Measure discovery",
    description:
      "Track product visits, votes, rankings, traffic trends, and crawler attention from the same launch dashboard.",
  },
]

const CORE_REASONS: FeatureCard[] = [
  {
    icon: IconUsersGroup,
    title: "Multiple discovery paths",
    description:
      "Eligible launches can appear in the homepage feed, Browse, leaderboards, categories, use cases, platforms, and product-type directories.",
  },
  {
    icon: IconChecklist,
    title: "Search-readable listing data",
    description:
      "Canonical metadata, structured data, XML sitemaps, and readable product details give each approved listing a consistent search footprint.",
  },
  {
    icon: IconChartArrows,
    title: "Analytics beside the listing",
    description:
      "See how people and crawlers reach your product without separating launch placement from its performance data.",
  },
  {
    icon: IconAnchor,
    title: "A clear path to your product",
    description:
      "A paid direct website link helps turn directory discovery into qualified product visits without making unrealistic SEO promises.",
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
    icon: IconCurrencyDollarOff,
    title: "Free is a real starting point",
    description:
      "A free launch includes a public product page, standard directory discovery, starter analytics, and sitemap eligibility.",
  },
  {
    icon: IconClockHour4,
    title: "Discovery can outlive launch day",
    description:
      "Product, category, use-case, alternative, and leaderboard pages give a listing more than one route back into discovery.",
  },
  {
    icon: IconChartArrows,
    title: "Measure before you promote",
    description:
      "Use {link} to review visits, traffic composition, and discovery trends before deciding whether additional placement is worthwhile.",
    highlight: {
      label: "Shipyard Analytics",
      href: ANALYTICS_PATH,
    },
  },
]

const COMPARISON_POINTS = [
  {
    feature: "Standard listing",
    shipyard:
      "A free public product page plus standard directory and launch-feed eligibility.",
    others:
      "Launch access, review rules, and free-listing benefits vary by platform.",
  },
  {
    feature: "Discovery window",
    shipyard:
      "Listings remain connected to product, category, use-case, alternative, and leaderboard pages.",
    others:
      "A leaderboard-first launch can concentrate most attention into a short ranking window.",
  },
  {
    feature: "Search footprint",
    shipyard:
      "Canonical product data, structured markup, sitemap inclusion, related directory links, and a direct website link on eligible paid plans.",
    others:
      "Search visibility depends on each platform's product-page and indexing model.",
  },
  {
    feature: "Measurement",
    shipyard:
      "Product visits, votes, rankings, traffic trends, and crawler attention live beside the launch.",
    others:
      "Available analytics and attribution differ across launch platforms.",
  },
]

const MOMENTUM_STEPS = [
  {
    title: "Publish the listing",
    detail:
      "Add a clear name, tagline, description, website, categories, pricing, logo, screenshots, and maker details.",
  },
  {
    title: "Earn discovery signals",
    detail:
      "Use the public product page, launch feed, votes, rankings, and directory placement to learn what attracts attention.",
  },
  {
    title: "Promote with evidence",
    detail:
      "Review traffic and product interest first, then add featured placement only when extra reach supports a real launch goal.",
  },
]

const PAGE_TITLE = "Product Hunt Alternative for Startup Launches"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `${BRAND_NAME} is a Product Hunt alternative where founders submit products free, keep a permanent directory page, and add paid promotion when ready.`,
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
            Product Hunt alternative
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight text-black md:text-6xl">
            A Product Hunt alternative built for lasting discovery.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#43474c] md:text-lg">
            Submit your product for free, keep a permanent directory page,
            appear across relevant discovery surfaces, and upgrade for more
            reach and a direct website link when your launch is ready.
            <span className="mt-3 block text-sm">
              {BRAND_NAME} is independent and is not affiliated with Product
              Hunt.
            </span>
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
            title="What founders get from the Shipyard directory"
            description="Shipyard combines a public product listing, multiple directory paths, launch signals, and analytics without requiring a paid standard submission."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {CORE_REASONS.map((reason) => (
              <ReasonTile key={reason.title} reason={reason} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white px-6 py-12 shadow-sm md:px-12 md:py-16">
            <div className="max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
                From discovery to your website
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-black md:text-4xl">
                Turn your Shipyard listing into qualified product visits
              </h2>
              <div className="mt-6 space-y-4 text-base leading-7 text-[#43474c]">
                <p>
                  Eligible paid plans include a direct link from your public
                  Shipyard product page to your website. People who discover
                  your launch can move from the directory to your product in one
                  click.
                </p>
                <p>
                  Because the link comes with a paid placement, Shipyard marks
                  it as sponsored for Google. It is designed to bring relevant
                  visitors to your product, not promise a Domain Rating or
                  search ranking boost.
                </p>
              </div>
              <Link
                href={PRICING_PATH}
                className="mt-7 inline-flex text-sm font-semibold text-[#0051d5] underline-offset-4 hover:underline"
              >
                Compare plans with direct website links
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <div className="rounded-xl bg-black px-6 py-12 text-white md:px-12 md:py-16">
            <SectionHeader
              title="Why use Shipyard alongside Product Hunt"
              description="Product Hunt can still be part of a launch. Shipyard adds an ongoing directory page, broader browse paths, and product-level measurement."
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
            title="Shipyard compared with a launch-day-only model"
            description="The useful difference is not a bigger claim. It is whether the listing stays discoverable, measurable, and free to start after launch day."
          />
          <div className="mt-12 overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <TableHead>Focus</TableHead>
                  <TableHead className="text-[#0051d5]">Shipyard</TableHead>
                  <TableHead>Single-day launch model</TableHead>
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
            title="A practical path from free listing to paid reach"
            description="Publish complete product data, observe real discovery signals, and only then decide whether extra placement is worth buying."
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
              Ready to submit your product?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#43474c] md:text-lg">
              Start with a free public listing. Add paid visibility later only
              if the product and timing are ready.
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
