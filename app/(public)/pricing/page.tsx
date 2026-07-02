import Link from "next/link"
import { Suspense } from "react"
import { JsonLdScript } from "next-seo"
import {
  BarChart3,
  CheckCircle2,
  Megaphone,
  Pin,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import {
  PRICING_FAQS,
  PricingPlansList,
  PricingPlansSkeleton,
} from "@/components/templates/public/pricing/page-content"
import { getPublicPlans } from "@/actions/public/plans/actions"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { AnswerBlocks } from "@/components/templates/public/common/AnswerBlocks"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, MEMBER_PRODUCTS_ADD_PATH, PRICING_PATH } from "@/lib/routes"
import { resolveSiteUrl, siteGrowthMetrics } from "@/lib/siteConfig"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Pricing"
const PRICING_DASHBOARD_IMAGE_URL =
  "https://media.shipyardhq.dev/global/pricing/dashboard-preview.webp"
const PRICING_DASHBOARD_IMAGE_SIZES =
  "(min-width: 1024px) 560px, calc(100vw - 32px)"
const numberFormatter = new Intl.NumberFormat("en-US")

function formatBuilderCountBadge(value: number) {
  const safeValue = Math.max(0, value)
  if (safeValue < 1000) {
    return numberFormatter.format(safeValue)
  }

  const roundedValue = Math.floor(safeValue / 100) * 100
  return `${numberFormatter.format(roundedValue)}+`
}

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Transparent pricing to list, launch, promote, and measure your product on ${BRAND_NAME}.`,
  canonical: PRICING_PATH,
})

const HERO_POINTS = [
  {
    icon: CheckCircle2,
    title: "Free to list",
    body: "Launch with a free placement and built-in analytics.",
  },
  {
    icon: TrendingUp,
    title: "Upgrade on demand",
    body: "Add featured or sponsored reach only when you need it.",
  },
  {
    icon: BarChart3,
    title: "Always-on insights",
    body: "Keep advanced analytics and priority placement rolling.",
  },
] as const

const PLACEMENT_POINTS = [
  {
    icon: Megaphone,
    title: "Partner Spotlights",
    body: "Spotlight placements keep your product visible while builders browse active categories.",
  },
  {
    icon: Pin,
    title: "Priority Placements",
    body: "Stay near the top of launch feeds during the window that matters most.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    body: "Track referrers, visitors, and engagement signals as your launch compounds.",
  },
] as const

type PricingSchemaPlan = Awaited<ReturnType<typeof getPublicPlans>>[number]

function buildPricingStructuredData(plans: PricingSchemaPlan[]) {
  const siteUrl = resolveSiteUrl()
  const pricingUrl = `${siteUrl}${PRICING_PATH}`
  const startUrl = `${siteUrl}${MEMBER_PRODUCTS_ADD_PATH}`
  const normalizedPlans = plans.length
    ? plans
    : [
        {
          id: "free-listing",
          slug: "free-listing",
          name: "Free listing",
          description: `List your product on ${BRAND_NAME} with a public launch page and starter analytics.`,
          type: "one_time_price",
          price: 0,
          discount: null,
          boostForDays: 0,
          isDefault: true,
          externalId: null,
          paymentFrequencyCount: undefined,
          paymentFrequencyInterval: undefined,
          subscriptionPeriodCount: undefined,
          subscriptionPeriodInterval: undefined,
          priceSuffix: undefined,
          productCount: 0,
          features: [],
        },
      ]

  const offerNodes = normalizedPlans.map((plan, index) => {
    const discount =
      typeof plan.discount === "number" && plan.discount > 0
        ? Math.min(plan.discount, 100)
        : 0
    const discountedCents = Math.max(
      0,
      Math.round((plan.price ?? 0) * (1 - discount / 100)),
    )
    const planUrl = plan.slug
      ? `${pricingUrl}#${plan.slug}`
      : `${pricingUrl}#plans`

    return {
      "@type": "Offer",
      "@id": `${pricingUrl}#offer-${plan.slug || index + 1}`,
      name: plan.name,
      description:
        plan.description ||
        `${plan.name} placement for product launches on ${BRAND_NAME}.`,
      url: planUrl,
      price: (discountedCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      itemOffered: { "@id": `${pricingUrl}#service` },
      seller: { "@id": `${siteUrl}#organization` },
      ...(plan.type === "recurring_price" && plan.paymentFrequencyInterval
        ? {
            eligibleDuration: {
              "@type": "QuantitativeValue",
              value: plan.paymentFrequencyCount ?? 1,
              unitText: String(plan.paymentFrequencyInterval).toUpperCase(),
            },
          }
        : {}),
    }
  })

  const prices = offerNodes
    .map((offer) => Number(offer.price))
    .filter((price) => Number.isFinite(price))

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${pricingUrl}#product`,
        name: `${BRAND_NAME} launch placements`,
        description: `Product launch listings, promotion placements, and analytics for founders launching on ${BRAND_NAME}.`,
        brand: { "@id": `${siteUrl}#organization` },
        category: "Product launch directory",
        url: pricingUrl,
        offers: {
          "@type": "AggregateOffer",
          url: pricingUrl,
          priceCurrency: "USD",
          lowPrice: prices.length ? Math.min(...prices).toFixed(2) : "0.00",
          highPrice: prices.length ? Math.max(...prices).toFixed(2) : "0.00",
          offerCount: offerNodes.length,
        },
      },
      {
        "@type": "Service",
        "@id": `${pricingUrl}#service`,
        name: `${BRAND_NAME} product launch promotion`,
        description: `Launch, promote, and measure products with ${BRAND_NAME} directory placement, sponsored reach, and analytics.`,
        serviceType: "Product launch directory and promotion",
        provider: { "@id": `${siteUrl}#organization` },
        areaServed: "Worldwide",
        url: pricingUrl,
        hasOfferCatalog: { "@id": `${pricingUrl}#offer-catalog` },
      },
      {
        "@type": "OfferCatalog",
        "@id": `${pricingUrl}#offer-catalog`,
        name: `${BRAND_NAME} pricing plans`,
        url: pricingUrl,
        itemListElement: offerNodes,
      },
      {
        "@type": "WebPage",
        "@id": `${pricingUrl}#pricing-page`,
        url: pricingUrl,
        name: PAGE_TITLE,
        mainEntity: { "@id": `${pricingUrl}#offer-catalog` },
        potentialAction: {
          "@type": "RegisterAction",
          target: startUrl,
          name: `Start a ${BRAND_NAME} launch`,
        },
      },
    ],
  }
}

export default async function PricingPage() {
  const plans = await getPublicPlans()
  const builderCountLabel = formatBuilderCountBadge(
    siteGrowthMetrics.builderCount,
  )
  const pricingStructuredData = buildPricingStructuredData(plans)
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
      <JsonLdScript
        data={pricingStructuredData}
        scriptKey="pricing-offers-jsonld"
      />
      {hasFaqStructuredData ? (
        <JsonLdScript data={faqStructuredData} scriptKey="pricing-faq-jsonld" />
      ) : null}

      <main className="overflow-hidden bg-[#f8f9ff] text-[#0b1c30]">
        <section className="relative mx-auto max-w-[1200px] px-4 pb-16 pt-20 text-center sm:px-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(ellipse_at_top,#dce9ff_0%,rgba(248,249,255,0)_68%)] opacity-80"
            aria-hidden
          />

          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0051d5]/10 bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#0051d5]">
              <Sparkles className="size-4" aria-hidden />
              Join {builderCountLabel} builders
            </div>

            <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-10 text-black sm:text-5xl sm:leading-[1.1] md:text-[56px]">
              Scale Your Launch.
              <br className="hidden md:block" /> Clear pricing for every stage.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-6 text-[#43474c] sm:text-lg sm:leading-7">
              Simple placements you can toggle as you grow. Start free, add
              reach when you need it, and keep ownership of your page.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-auto w-full rounded-lg border-0 bg-black px-8 py-3 text-lg font-semibold text-white shadow-none hover:bg-black/90 sm:w-auto"
              >
                <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                  Start for free
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto w-full rounded-lg border-[#E2E8F0] bg-white px-8 py-3 text-lg font-semibold text-black shadow-none hover:bg-[#eff4ff] sm:w-auto"
              >
                <Link href="#plans">Compare plans</Link>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {HERO_POINTS.map((point) => {
                const Icon = point.icon

                return (
                  <div
                    key={point.title}
                    className="flex items-start gap-4 rounded-lg border border-[#E2E8F0] bg-white p-6 text-left"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#0051d5]">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold leading-5 text-black">
                        {point.title}
                      </h3>
                      <p className="mt-1 text-[11px] font-medium leading-[14px] text-[#43474c]">
                        {point.body}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <AnswerBlocks
          blocks={[
            {
              title: "What this page lists",
              body: `${BRAND_NAME} pricing lists free submission, launch promotion, placement, and analytics options for makers publishing products in the Shipyard directory.`,
            },
            {
              title: "Who it is for",
              body: "This page is for founders, indie makers, SaaS teams, and product marketers deciding whether to list for free or add paid visibility during a launch window.",
            },
            {
              title: "How placement works",
              body: "Free listings can enter public discovery surfaces. Paid plans can add eligible featured, sponsored, priority, spotlight, or analytics benefits depending on the active plan configuration.",
            },
            {
              title: "Freshness policy",
              body: "Pricing content uses current public plan records where available and revalidates with the site so listing, placement, and promotion details can change as plans are updated.",
            },
          ]}
        />

        <section
          id="plans"
          className="bg-[#eff4ff] px-4 py-20 sm:px-6 md:py-24"
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-12 text-center md:mb-16">
              <h2 className="text-3xl font-bold leading-10 text-black">
                Launch placements
              </h2>
              <p className="mt-3 text-sm leading-5 text-[#43474c]">
                Choose the reach that matches your launch window. Upgrade
                anytime.
              </p>
            </div>

            <Suspense
              fallback={<PricingPlansSkeleton withSectionWrapper={false} />}
            >
              <PricingPlansList
                disableSectionWrapper
                showTypeToggle
                cardVariant="placement"
              />
            </Suspense>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold leading-10 text-black">
                Where does the budget go?
              </h2>
              <p className="mt-4 max-w-xl text-base leading-6 text-[#43474c]">
                We prioritize ROI for makers. Every placement is designed to put
                your product in front of discovery-ready builders and
                operator-fans.
              </p>

              <div className="mt-10 space-y-8">
                {PLACEMENT_POINTS.map((point) => {
                  const Icon = point.icon

                  return (
                    <div key={point.title} className="flex gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#dce9ff] text-black">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold leading-5 text-black">
                          {point.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-medium leading-[16px] text-[#43474c]">
                          {point.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
              <Image
                src={PRICING_DASHBOARD_IMAGE_URL}
                alt="Product analytics dashboard preview with line charts and launch growth metrics."
                width={900}
                height={650}
                sizes={PRICING_DASHBOARD_IMAGE_SIZES}
                className="h-full min-h-[320px] w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#eff4ff] px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl">
            <div className="mb-12 text-center md:mb-16">
              <h2 className="text-3xl font-bold leading-10 text-black">FAQ</h2>
              <p className="mt-2 text-sm leading-5 text-[#43474c]">
                Quick answers about plans, upgrades, and credits.
              </p>
            </div>

            <Accordion type="multiple" className="space-y-4" id="faq">
              {PRICING_FAQS.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`pricing-faq-${index}`}
                  className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white px-6"
                >
                  <AccordionTrigger className="text-left text-sm font-bold text-black hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-6 text-[#43474c]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
    </>
  )
}
