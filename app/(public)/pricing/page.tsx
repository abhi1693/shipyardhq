import Link from "next/link"
import { Suspense } from "react"
import { JsonLdScript } from "next-seo"
import { CheckCircle2 } from "lucide-react"

import {
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
import { Button } from "@/components/atoms/button"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, PRICING_PATH, REWARDS_PATH } from "@/lib/routes"

const PAGE_TITLE = "Pricing"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: "Transparent pricing for every stage.",
})

const HERO_POINTS = [
  {
    title: "Free to list",
    body: "Launch with a free placement and built-in analytics.",
  },
  {
    title: "Upgrade on demand",
    body: "Add featured or sponsored reach only when you need it.",
  },
  {
    title: "Team-ready",
    body: "Org subscriptions add shared access and analytics.",
  },
]

export default function PricingPage() {
  const faqStructuredData = buildFaqStructuredData(
    PRICING_FAQS.map((faq) => ({ question: faq.question, answer: faq.answer })),
    { pageUrl: PRICING_PATH },
  )
  const hasFaqStructuredData = faqStructuredData.mainEntity.length > 0

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="pricing"
        webPage={{ path: PRICING_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: PRICING_PATH },
          ],
        }}
      />
      {hasFaqStructuredData ? (
        <JsonLdScript data={faqStructuredData} scriptKey="pricing-faq-jsonld" />
      ) : null}
      <main className="relative isolate pb-16">
        <section className="py-14">
          <div className="mx-auto max-w-[76rem] px-4 md:px-8">
            <div className="space-y-6 text-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)] shadow-sm">
                Pricing
              </span>
              <div className="space-y-4 text-balance">
                <h1 className="text-4xl font-bold tracking-tight text-[#0f172a] sm:text-[2.8rem]">
                  Clear pricing for every launch
                </h1>
                <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Simple placements you can toggle as you grow. Start free, add
                  reach when you need it, and keep ownership of your page.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-w-[12rem]">
                  <Link href="/register">Start for free</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-w-[12rem] bg-white text-foreground shadow-sm"
                >
                  <Link href={REWARDS_PATH}>Explore rewards</Link>
                </Button>
              </div>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {HERO_POINTS.map((point) => (
                <div
                  key={point.title}
                  className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.32)]"
                >
                  <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {point.title}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {point.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="rounded-[24px] border border-border bg-white p-8 shadow-sm sm:p-10">
              <div className="mx-auto max-w-2xl text-center space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Launch placements
                </h2>
                <p className="text-muted-foreground">
                  Choose the reach that matches your launch window. Upgrade
                  anytime.
                </p>
              </div>
              <div className="mt-8 sm:mt-10">
                <Suspense
                  fallback={<PricingPlansSkeleton withSectionWrapper={false} />}
                >
                  <PricingPlansList disableSectionWrapper />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="rounded-[24px] border border-border bg-white p-8 shadow-sm sm:p-10">
              <div className="mx-auto max-w-2xl text-center space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Subscriptions for teams
                </h2>
                <p className="text-muted-foreground">
                  Shared organizations and analytics when you need ongoing team
                  access.
                </p>
              </div>
              <Suspense fallback={<SubscriptionPlansSkeleton />}>
                <SubscriptionPlansList />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="pb-14">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="mx-auto max-w-3xl space-y-8 rounded-[24px] border border-border bg-white px-6 py-10 shadow-sm sm:px-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
                <p className="text-muted-foreground">
                  Quick answers about plans, upgrades, and credits.
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
        </section>
      </main>
    </>
  )
}
