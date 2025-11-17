import Link from "next/link"
import { Check, ListChecks, Radar, Sparkles, Target, Users } from "lucide-react"
import { Image } from "@/components/atoms/image"
import { Button } from "@/components/atoms/button"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"

const INSIGHT_STAGES = [
  {
    title: "Map your product automatically",
    description:
      "Shipyard crawls your website, landing pages, and docs to capture positioning, messaging, and funnel gaps in minutes.",
    Icon: Radar,
  },
  {
    title: "Benchmark the competitive landscape",
    description:
      "We assemble a living landscape of adjacent products, including differentiators, strengths, weaknesses, and direct links.",
    Icon: Target,
  },
  {
    title: "Surface community conversations",
    description:
      "Insights identifies where builders already talk about your problem space and distills sentiment from the threads that matter.",
    Icon: Users,
  },
  {
    title: "Deliver prioritized next moves",
    description:
      "Receive an executive briefing with recommended experiments, outreach tactics, and metrics to watch—no spreadsheets required.",
    Icon: ListChecks,
  },
] as const

const INSIGHT_OUTCOMES = [
  "Executive summary that lands in your inbox when the pipeline wraps.",
  "Competitor dossiers you can share with product, marketing, and growth teams.",
  "Community plan with channel suggestions, angles, and proof points to test.",
  "Action priorities ranked by impact so teams know what to ship next.",
] as const

type CTAConfig = {
  label: string
  href: string
}

type InsightsShowcaseProps = {
  eyebrow?: string
  title?: string
  description?: string
  primaryCta?: CTAConfig
  secondaryCta?: CTAConfig
}

const DEFAULT_PRIMARY_CTA: CTAConfig = {
  label: "Run insights on your product",
  href: MEMBER_PRODUCTS_PATH,
}

const DEFAULT_SECONDARY_CTA: CTAConfig = {
  label: "Compare plan options",
  href: PRICING_PATH,
}

export function InsightsShowcase({
  eyebrow = "Introducing Insights",
  title = "Insights turns signal into your next roadmap move",
  description = "Launch the Shipyard Insights pipeline to pair your analytics with competitive, community, and sentiment intelligence—free plans include one run each week and upgrades add more credits.",
  primaryCta = DEFAULT_PRIMARY_CTA,
  secondaryCta = DEFAULT_SECONDARY_CTA,
}: InsightsShowcaseProps = {}) {
  return (
    <section className="relative border-y border-border bg-white py-20">
      <div className="relative mx-auto max-w-[84rem] px-4 md:px-8 space-y-16">
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2-text,#0a5678)] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> {eyebrow}
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {primaryCta ? (
              <Button
                asChild
                size="lg"
                className="shadow-[0px_25px_55px_-35px_rgba(7,58,104,0.85)]"
              >
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            ) : null}
            {secondaryCta ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-border bg-white text-muted-foreground shadow-sm"
              >
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-border bg-white shadow-sm">
          <Image
            src="/insights-demo.png"
            alt="Shipyard Insights pipeline report preview"
            width={1572}
            height={704}
            className="relative z-10 h-auto w-full object-cover"
          />
        </figure>

        <div className="relative grid gap-6 lg:grid-cols-4">
          {INSIGHT_STAGES.map(
            ({ title: stageTitle, description: stageDescription, Icon }) => (
              <article
                key={stageTitle}
                className="flex h-full flex-col gap-4 rounded-3xl border border-border bg-white p-6 text-left shadow-sm"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {stageTitle}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stageDescription}
                </p>
              </article>
            ),
          )}
        </div>

        <div className="relative rounded-3xl border border-border bg-white px-8 py-10 shadow-sm">
          <h3 className="text-2xl font-semibold text-foreground">
            What you get
          </h3>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            {INSIGHT_OUTCOMES.map((outcome) => (
              <li key={outcome} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Pipeline runs update as new signals roll in—free plans refresh
            weekly, while higher tiers add extra credits for faster iteration.
          </p>
        </div>
      </div>
    </section>
  )
}
