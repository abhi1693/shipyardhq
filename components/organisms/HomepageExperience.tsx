import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import PublicContainer from "@/components/layout/PublicContainer"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"

interface HomepageExperienceProps {
  stats?: {
    totalProducts?: number
    totalCreators?: number
    totalUpvotes?: number
    totalInsights?: number
  }
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value?: number) {
  if (!value || value <= 0) return "—"
  return numberFormatter.format(value)
}

export function HomepageExperience({ stats }: HomepageExperienceProps) {
  const highlightMetrics = [
    {
      label: "Products live",
      value: formatNumber(stats?.totalProducts),
      helper: "Launch-ready builds charting new waters.",
    },
    {
      label: "Insights generated",
      value: formatNumber(stats?.totalInsights),
      helper: "Signals distilled into weekly reports.",
    },
    {
      label: "Upvotes logged",
      value: formatNumber(stats?.totalUpvotes),
      helper: "Momentum powering leaderboard climbs.",
    },
  ]

  const quickActions = [
    {
      eyebrow: "Map live demand",
      title: "Trend radar highlights where builders pile on",
      description:
        "Track the categories gaining fresh launches and community signal so you pick the right moment to appear.",
      href: BROWSE_PATH,
      label: "Open the radar",
    },
    {
      eyebrow: "Meet the fleet",
      title: "Leaderboard celebrates builders shipping now",
      description:
        "Track fellow crews, trade feedback, and celebrate streaks that keep products afloat.",
      href: LEADERBOARD_PATH,
      label: "See standings",
    },
    {
      eyebrow: "Plan your route",
      title: "Why Shipyard guides your go-to-market",
      description:
        "Compare how Shipyard boosts discovery versus other launch pads before you commit.",
      href: WHY_SHIPYARD_PATH,
      label: "Compare benefits",
    },
  ]

  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden bg-background/92 shadow-[0px_48px_120px_-80px_rgba(7,58,104,0.85)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.45] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(120%_120%_at_0%_0%, rgba(7, 58, 104, 0.22), transparent 68%), radial-gradient(120%_110%_at_100%_-10%, rgba(15, 86, 140, 0.2), transparent 75%)",
          maskImage:
            "radial-gradient(80%_120%_at_50%_0%, rgba(0,0,0,0.92), transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(7, 53, 104, 0.1) 1px, transparent 1px), linear-gradient(180deg, rgba(7, 53, 104, 0.1) 1px, transparent 1px)",
          backgroundSize: "180px 180px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-40%] bottom-[-60px] -z-40 h-64 rounded-[50%] bg-[radial-gradient(80%_100%_at_50%_0%,var(--brand-3)/0.22,transparent_85%)] blur-3xl"
      />

      <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="relative space-y-10">
          <div className="max-w-xl space-y-4">
            <Badge
              variant="secondary"
              className="inline-flex items-center justify-center gap-2 border-none bg-white/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-2)] backdrop-blur"
            >
              Modern launch workflow
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to launch, discover, and iterate
            </h2>
            <p className="text-base text-muted-foreground">
              Shipyard blends community proof, analytics, and curated placement so
              every builder can launch with confidence and buyers can find what&apos;s
              next.
            </p>
          </div>

          <dl className="grid gap-6 sm:grid-cols-3">
            {highlightMetrics.map((metric) => (
              <div key={metric.label} className="relative space-y-2 pl-6">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-[linear-gradient(180deg,var(--brand-1),var(--brand-2))]"
                />
                <dt className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="text-2xl font-semibold text-foreground">
                  {metric.value}
                </dd>
                <p className="text-xs text-muted-foreground/80">{metric.helper}</p>
              </div>
            ))}
          </dl>

          <div className="relative space-y-2 pl-6">
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-[linear-gradient(180deg,var(--brand-1),var(--brand-2))]"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Publish once, stay visible
            </p>
            <p className="text-sm text-muted-foreground/80">
              Products featured on Shipyard continue surfacing across browse,
              radar, and community feeds long after launch week.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-[0px_24px_60px_-40px_rgba(7,58,104,0.65)]"
            >
              <Link href={MEMBER_PRODUCTS_PATH}>Submit your launch</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.12] bg-background/80 text-[color:var(--brand-1)] shadow-[0px_22px_55px_-42px_rgba(7,58,104,0.6)]"
            >
              <Link href={BROWSE_PATH}>Explore the fleet</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative block overflow-hidden pl-6 transition-transform hover:translate-x-1"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-[linear-gradient(180deg,var(--brand-2),var(--brand-3))] transition-opacity group-hover:opacity-100"
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {item.eyebrow}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--brand-2)]">
                {item.label} <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PublicContainer>
  )
}

export default HomepageExperience
