import Image from "next/image"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { buildPageMetadata } from "@/lib/metadata"
import {
  MEMBER_BASE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
} from "@/lib/routes"
import PublicContainer from "@/components/layout/PublicContainer"
import { Button } from "@/components/atoms/button"
import { FaqSection } from "@/components/organisms/FaqSection"
import { Dialog, DialogContent, DialogTrigger } from "@/components/atoms/dialog"
import { cn } from "@/lib/utils"
import { InsightsShowcase } from "@/components/organisms/insights/InsightsShowcase"

const PLAN_HIGHLIGHTS = [
  {
    tier: "Free plan",
    headline: "Understand your baseline",
    blurb:
      "Keep a pulse on launches without paying a cent. The core dashboard tracks the signals that matter most when you are just getting started.",
    metrics: [
      "Lifetime vote and click totals",
      "Overall page views across your launch window",
      "Views over time chart with 7–90 day ranges",
      "Weekly Insights run to capture a full competitive and community report",
    ],
  },
  {
    tier: "Paid plans",
    headline: "Pinpoint what drives conversions",
    blurb:
      "Upgrade for deeper context around growth campaigns. Identify which audiences convert, what devices they use, and where to double down.",
    metrics: [
      "Click-through rates split by referrer, device, and browser",
      "Visitor loyalty and retention cohorts to spot repeat fans",
      "Operating system and traffic channel breakdowns",
      "Extra Insights credits so you can rerun the pipeline whenever signal shifts",
    ],
  },
  {
    tier: "Crew plan",
    headline: "Command a fleet-wide view",
    blurb:
      "Give every organization a shared control tower. Crew plan dashboards centralize analytics for all products so teams can compare launches at a glance.",
    metrics: [
      "Organization-level rollups across every product",
      "Cross-team comparisons without switching accounts",
      "Shared context for planning the next release",
      "Team-wide Insights credits that benchmark every product in your fleet",
    ],
  },
]

const MOMENTUM_POINTS = [
  {
    title: "Spot trends early",
    body: "Overlay views, votes, and clicks to understand how experiments perform in the first critical days of a launch.",
  },
  {
    title: "Measure channel health",
    body: "Use referrer, device, and browser splits to see which campaigns bring high intent visitors versus casual traffic.",
  },
  {
    title: "Plan the next iteration",
    body: "Pair retention signals with Insights recommendations to prioritize onboarding tweaks, pricing experiments, and outreach work.",
  },
]

const HOW_IT_WORKS_STEPS = [
  {
    title: "Start from Member View",
    detail:
      "Open the member dashboard and head to Products to see your live and draft listings.",
  },
  {
    title: "Pick a product",
    detail:
      "Choose the row you want, then select Analytics to open the detailed view—an AI summary now highlights the biggest shifts for you.",
  },
  {
    title: "Share with your crew",
    detail:
      "Invite collaborators on eligible plans so everyone can review performance, plan experiments, and celebrate wins together.",
  },
  {
    title: "Request an Insights run",
    detail:
      "Use the Insights action to generate competitive research, community intelligence, and prioritized recommendations in a single report—free plans include one run each week.",
  },
]

type GalleryItem = {
  src: string
  alt: string
  caption: string
  width: number
  height: number
  layoutClass?: string
  containerClass?: string
  priority?: boolean
}

const ANALYTICS_GALLERY: GalleryItem[] = [
  {
    src: "/analytics-1.png",
    alt: "Screenshot of Shipyard analytics overview with core product metrics",
    caption:
      "Track votes, clicks, and total views for every launch at a glance.",
    width: 1600,
    height: 860,
    containerClass: "aspect-video",
    priority: true,
  },
  {
    src: "/analytics-2.png",
    alt: "Screenshot of Shipyard analytics referrer and device breakdown",
    caption:
      "Understand which channels, devices, and browsers drive conversions.",
    width: 1600,
    height: 929,
    containerClass: "aspect-video",
  },
  {
    src: "/analytics-3.png",
    alt: "Screenshot of Shipyard analytics retention dashboard",
    caption: "Monitor loyalty and repeat visits to guide onboarding tweaks.",
    width: 1600,
    height: 911,
    layoutClass: "lg:col-span-2 lg:mx-auto lg:max-w-4xl",
    containerClass: "aspect-video lg:aspect-[21/10]",
  },
]

export const metadata = buildPageMetadata({
  title: "Analytics",
  description:
    "Understand how builders engage with your products. Shipyard analytics now includes plan-specific dashboards for free, paid, and crew members.",
})

export default function AnalyticsPage() {
  return (
    <main className="relative isolate overflow-hidden bg-white">

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        className="relative"
        innerClassName="relative text-center"
        fillScreen={false}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
          Analytics
        </span>
        <div className="mx-auto mt-8 max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Analytics built for every Shipyard builder
          </h1>
          <p className="text-lg text-muted-foreground">
            Whether you are launching your first product or managing an entire
            fleet, the new dashboards pair with Insights so you can understand
            traction, surface opportunities, and map conversations around your
            brand—starting with a weekly run on the free plan.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)]"
          >
            <Link href={MEMBER_BASE_PATH}>View your dashboard</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-[color:var(--brand-1)/0.35] bg-background/70 text-[color:var(--brand-1)] shadow-[0px_18px_40px_-32px_rgba(7,58,104,0.75)]"
          >
            <Link href={PRICING_PATH}>Compare plans</Link>
          </Button>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles
            className="size-4 text-[color:var(--brand-2)]"
            aria-hidden
          />
          Every product analytics page now opens with an AI-crafted recap.
          <Button
            asChild
            size="sm"
            variant="link"
            className="px-0 text-[color:var(--brand-1)]"
          >
            <Link href={MEMBER_PRODUCTS_PATH}>See your AI summary</Link>
          </Button>
        </p>
      </PublicContainer>

      <InsightsShowcase
        eyebrow="Insights + Analytics"
        title="Insights extends every Shipyard dashboard"
        description="Activate the pipeline to pair your analytics with competitive research, community sentiment, and prioritized recommendations—free plans include a weekly run and upgrades add more credits."
        primaryCta={{
          label: "Request insights from your dashboard",
          href: MEMBER_BASE_PATH,
        }}
        secondaryCta={{
          label: "See plan coverage",
          href: PRICING_PATH,
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="space-y-10"
        fillScreen={false}
      >
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            See your dashboards in action
          </h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground">
            Each view is designed to surface the questions builders ask
            most—from high-level traction to channel attribution and team-wide
            rollups.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          {ANALYTICS_GALLERY.map((shot) => (
            <div
              key={shot.src}
              className={cn("w-full lg:col-span-1", shot.layoutClass)}
            >
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group flex w-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--brand-1)/0.15] bg-background/85 text-left shadow-[0px_25px_55px_-35px_rgba(7,58,104,0.55)] backdrop-blur transition hover:border-[color:var(--brand-1)/0.3] hover:shadow-[0px_30px_60px_-30px_rgba(7,58,104,0.6)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[color:var(--brand-2)] focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-zoom-in"
                    aria-label={`View larger analytics preview: ${shot.caption}`}
                  >
                    <span
                      className={cn(
                        "relative block bg-background",
                        shot.containerClass ?? "aspect-video",
                      )}
                    >
                      <Image
                        src={shot.src}
                        alt={shot.alt}
                        fill
                        className="object-contain"
                        sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                        priority={Boolean(shot.priority)}
                      />
                    </span>
                    <span className="block px-6 py-5 text-sm text-muted-foreground">
                      {shot.caption}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-5xl border-none bg-background/95 p-0 shadow-2xl rounded-none"
                  showCloseButton={false}
                >
                  <div className="relative overflow-hidden border border-[color:var(--brand-1)/0.2] bg-background">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={shot.width}
                      height={shot.height}
                      className="h-auto w-full object-contain bg-background"
                      sizes="(min-width: 1280px) 960px, 100vw"
                    />
                  </div>
                  <p className="px-6 pb-6 pt-4 text-center text-sm text-muted-foreground">
                    {shot.caption}
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-20"
        className="relative"
        innerClassName="space-y-12"
        fillScreen={false}
      >
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Choose the visibility that fits your crew
          </h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground">
            Every plan now includes tailored analytics. Start free, upgrade when
            you need granular attribution, and bring your entire organization
            along when you scale.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLAN_HIGHLIGHTS.map((plan) => (
            <article
              key={plan.tier}
              className="flex h-full flex-col justify-between rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/80 p-8 text-left shadow-[0px_25px_60px_-35px_rgba(7,58,104,0.6)] backdrop-blur"
            >
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[color:var(--brand-2)]">
                  {plan.tier}
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {plan.headline}
                </h3>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {plan.metrics.map((metric) => (
                  <li key={metric} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-1)]" />
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        innerClassName="grid gap-12 lg:grid-cols-[1.2fr_minmax(0,1fr)]"
        fillScreen={false}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Turn signal into momentum
            </h2>
            <p className="text-base text-muted-foreground">
              Use the analytics suite to understand which experiments land and
              where to steer next.
            </p>
          </div>
          <div className="space-y-5">
            {MOMENTUM_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-[color:var(--brand-1)/0.15] bg-background/80 p-5 shadow-[0px_20px_40px_-36px_rgba(7,58,104,0.65)] backdrop-blur"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6 rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/90 p-8 shadow-[0px_30px_50px_-35px_rgba(7,58,104,0.55)] backdrop-blur">
          <h2 className="text-2xl font-semibold text-foreground">
            How to open your analytics dashboard
          </h2>
          <ol className="space-y-4 text-sm text-muted-foreground list-decimal pl-5">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <li key={step.title} className="space-y-1">
                <span className="font-semibold text-foreground">
                  {step.title}
                </span>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Dashboards update continuously—refresh after a campaign push and
            share highlights with your crew to keep momentum rolling.
          </p>
        </div>
      </PublicContainer>

      <FaqSection />
    </main>
  )
}
