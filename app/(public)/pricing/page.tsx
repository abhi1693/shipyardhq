import Link from "next/link"
import { IconFlag3, IconSparkles, IconTargetArrow } from "@tabler/icons-react"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"
import { getProducts } from "@/actions/public/products/featured"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { SubscriptionPlanCard } from "@/components/molecules/SubscriptionPlanCard"
import { PlanType } from "@/lib/vendor/prisma/client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, REWARDS_PATH } from "@/lib/routes"
import { InsightsShowcase } from "@/components/organisms/insights/InsightsShowcase"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

export const metadata = buildPageMetadata({
  title: "Pricing",
  description: "Transparent pricing for every stage.",
})

const CORE_PERKS = [
  {
    icon: IconFlag3,
    title: "Launch-ready guidance",
    body: "Preflight checklists, asset templates, and launch-day reminders keep every release steady at the helm.",
  },
  {
    icon: IconTargetArrow,
    title: "Flexible exposure",
    body: "Dial in the reach you need—from free listings to homepage takeovers—with instant plan upgrades.",
  },
  {
    icon: IconSparkles,
    title: "Insights built in",
    body: "Automated research pipelines surface competitor intel, community chatter, and recommended plays—starting with a weekly run on the free plan and more credits as you upgrade.",
  },
]

const PRICING_FAQS = [
  {
    question: "Can I start for free and upgrade later?",
    answer:
      "Absolutely. Every maker can list for free. Upgrade any product for extra reach—featured badges, homepage placement, newsletter spots—whenever you need a boost.",
  },
  {
    question: "Which plans include Shipyard Insights?",
    answer:
      "Every plan includes Insights. Free listings get one run per week, while paid placements and crew subscriptions add more credits so you can refresh findings whenever you need.",
  },
  {
    question: "Do plans renew automatically?",
    answer:
      "Plans are purchased per launch window. When a term ends you decide whether to re-up. No surprise auto-renewals—just opt in when you’re ready for the next voyage.",
  },
  {
    question: "What level of support is included?",
    answer:
      "All plans include launch guidance, template assets, and async crew support. Premium placements add one-on-one review sessions and priority feature requests.",
  },
  {
    question: "Can my team collaborate on launches?",
    answer:
      "Team access unlocks on plans that include organizations. Add your crew, assign roles, and manage launches together from a shared dashboard.",
  },
]

export default async function PricingPage() {
  const [plans, subscriptionPlans, featured] = await Promise.all([
    getPublicPlans({ type: PlanType.one_time_price }),
    getPublicPlans({ type: PlanType.recurring_price }),
    getProducts("featured"),
  ])

  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section
        className={brandGradient(
          "relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-24 shadow-[0px_60px_140px_-60px_rgba(18,66,112,0.7)]",
        )}
      >
        <div className="relative mx-auto flex max-w-[84rem] flex-col items-center gap-10 px-4 text-center text-white md:px-8">
          <span
            className={gradientTint(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80",
            )}
          >
            Pricing
          </span>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Pricing built for every voyage
            </h1>
            <p className="text-lg text-white/85">
              Pick the placement that fits your launch. Switch plans anytime,
              keep full control of your product page, and tap Insights for
              automated research—starting with weekly runs on the free plan.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={launchPrimaryButton({ size: "lg" })}
            >
              Start for free
            </Link>
            <Link
              href={REWARDS_PATH}
              className={launchSecondaryButton({
                size: "lg",
                className: "text-white/90 hover:text-white",
              })}
            >
              Explore rewards
            </Link>
          </div>
          <div className="grid gap-4 rounded-2xl border border-white/30 bg-white/10 px-6 py-6 text-left text-white shadow-[0px_25px_60px_-40px_rgba(7,58,104,0.6)] backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Launch playbooks
              </p>
              <p className="mt-1 text-xs text-white/80">
                Step-by-step checklists for every plan.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Upgrade anytime
              </p>
              <p className="mt-1 text-xs text-white/80">
                Plans stack instantly—no downtime for your listing.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Analytics & insights
              </p>
              <p className="mt-1 text-xs text-white/80">
                Track signal across every tier and trigger Insights runs for
                competitive, community, and action reports—free includes one run
                per week and upgrades add more credits.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Choose your promotion tier
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every plan includes verified launch tooling. Upgrade for
              additional visibility across the harbor.
            </p>
          </div>
          <PricingTable plans={plans} />
        </div>
      </section>

      <InsightsShowcase
        eyebrow="Insights included"
        title="Insights credits scale with your plan"
        description="Every plan includes the Insights pipeline. Start with a weekly run on free listings and add more credits with paid placements to keep competitor intel, community sentiment, and prioritized actions fresh."
        primaryCta={{
          label: "Unlock insights with Shipyard",
          href: "/register",
        }}
        secondaryCta={{
          label: "See analytics & insights",
          href: ANALYTICS_PATH,
        }}
      />

      {subscriptionPlans.length > 0 && (
        <section className="relative py-16">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Keep your crew connected
              </h2>
              <p className="mt-3 text-muted-foreground">
                Subscriptions unlock shared organizations, advanced analytics,
                recurring Insights credits, and dedicated collaboration
                resources.
              </p>
            </div>
            <div className="mt-10 mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-5 lg:gap-6">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex w-full max-w-sm flex-1 basis-full sm:basis-[20rem]"
                >
                  <SubscriptionPlanCard plan={plan} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/85 px-8 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.65)] backdrop-blur sm:grid-cols-3">
            {CORE_PERKS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="relative py-16">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Featured success stories
              </h2>
              <p className="text-muted-foreground">
                Makers who upgraded to featured placements and found their crew.
              </p>
            </div>
            <div className="mt-10">
              <FeaturedProductGrid items={featured.slice(0, 6)} />
            </div>
          </div>
        </section>
      )}

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="max-w-3xl">
            <div className="space-y-8 rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-6 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
                <p className="mt-2 text-muted-foreground">
                  Answers to the questions launch captains ask most.
                </p>
              </div>
              <Accordion type="multiple" className="w-full" id="faq">
                {PRICING_FAQS.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`pricing-faq-${index}`}
                  >
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
