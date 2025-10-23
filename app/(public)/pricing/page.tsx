import Link from "next/link"
import { Suspense } from "react"

import {
  CORE_PERKS,
  FeaturedProductsList,
  FeaturedProductsSkeleton,
  PRICING_FAQS,
  PricingPlansList,
  PricingPlansSkeleton,
  SubscriptionPlansList,
  SubscriptionPlansSkeleton,
} from "@/components/templates/public/pricing/page-content"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"
import { InsightsShowcase } from "@/components/organisms/insights/InsightsShowcase"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, REWARDS_PATH } from "@/lib/routes"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

export const metadata = buildPageMetadata({
  title: "Pricing",
  description: "Transparent pricing for every stage.",
})

export default function PricingPage() {
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
              Pricing built for every launch plan
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

      <HeroStickyBanner
        wrapperClassName="mt-6"
        innerClassName="max-w-[84rem]"
      />

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Choose your promotion tier
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every plan includes verified launch tooling. Upgrade for
              additional visibility across Shipyard.
            </p>
          </div>
          <Suspense fallback={<PricingPlansSkeleton />}>
            <PricingPlansList />
          </Suspense>
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

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Keep your team connected
            </h2>
            <p className="mt-3 text-muted-foreground">
              Subscriptions unlock shared organizations, advanced analytics,
              recurring Insights credits, and dedicated collaboration
              resources.
            </p>
          </div>
          <Suspense fallback={<SubscriptionPlansSkeleton />}>
            <SubscriptionPlansList />
          </Suspense>
        </div>
      </section>

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

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Featured success stories
            </h2>
            <p className="text-muted-foreground">
              Makers who upgraded to featured placements and grew their
              audience.
            </p>
          </div>
          <Suspense fallback={<FeaturedProductsSkeleton />}>
            <FeaturedProductsList />
          </Suspense>
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="max-w-3xl">
            <div className="space-y-8 rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-6 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
                <p className="mt-2 text-muted-foreground">
                  Answers to the questions launch teams ask most.
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
