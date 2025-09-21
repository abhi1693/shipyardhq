import Link from "next/link"
import { IconFlag3, IconSparkles, IconTargetArrow } from "@tabler/icons-react"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"
import PublicContainer from "@/components/layout/PublicContainer"
import { getProducts } from "@/actions/public/products/featured"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { SubscriptionPlanCard } from "@/components/molecules/SubscriptionPlanCard"
import { PlanType } from "@/lib/vendor/prisma/client"
import { Button } from "@/components/atoms/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import { buildPageMetadata } from "@/lib/metadata"

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
    title: "Crew on standby",
    body: "Get async support from our harbor crew plus usage analytics that surface what resonates.",
  },
]

const PRICING_FAQS = [
  {
    question: "Can I start for free and upgrade later?",
    answer:
      "Absolutely. Every maker can list for free. Upgrade any product for extra reach—featured badges, homepage placement, newsletter spots—whenever you need a boost.",
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
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(75% 110% at 50% 0%, rgba(0, 0, 0, 0.88), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        className="relative"
        fillScreen={false}
        innerClassName="relative"
      >
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
            Pricing
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Pricing built for every voyage
            </h1>
            <p className="text-lg text-muted-foreground">
              Pick the placement that fits your launch. Switch plans anytime and
              keep full control of your product page.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)]"
            >
              <Link href="/register">Start for free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
            >
              <Link href="#faq">Talk with the crew</Link>
            </Button>
          </div>
          <div className="grid gap-4 rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-6 text-left shadow-[0px_25px_60px_-40px_rgba(7,58,104,0.6)] backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Launch playbooks
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Step-by-step checklists for every plan.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Upgrade anytime
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Plans stack instantly—no downtime for your listing.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Launch analytics
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Track upvotes, traffic sources, and conversions across every
                tier.
              </p>
            </div>
          </div>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        fillScreen={false}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Choose your promotion tier
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every plan includes verified launch tooling. Upgrade for additional
            visibility across the harbor.
          </p>
        </div>
        <PricingTable plans={plans} />
      </PublicContainer>

      {subscriptionPlans.length > 0 && (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-16"
          className="relative"
          fillScreen={false}
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Keep your crew connected
            </h2>
            <p className="mt-3 text-muted-foreground">
              Subscriptions unlock shared organizations, advanced analytics, and
              dedicated collaboration resources.
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
        </PublicContainer>
      )}

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        fillScreen={false}
      >
        <div className="grid gap-6 rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/85 px-8 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.65)] backdrop-blur sm:grid-cols-3">
          {CORE_PERKS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </PublicContainer>

      {featured.length > 0 && (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-16"
          className="relative"
          fillScreen={false}
        >
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
        </PublicContainer>
      )}

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        className="relative"
        fillScreen={false}
        innerClassName="max-w-3xl"
      >
        <div className="space-y-8 rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-6 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
            <p className="mt-2 text-muted-foreground">
              Answers to the questions launch captains ask most.
            </p>
          </div>
          <Accordion type="multiple" className="w-full" id="faq">
            {PRICING_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`pricing-faq-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </PublicContainer>
    </main>
  )
}
