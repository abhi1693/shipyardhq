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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildPageMetadata } from "@/lib/metadata"
import {
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  REWARDS_PATH,
} from "@/lib/routes"

const PAGE_TITLE = "Pricing"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: "Transparent pricing for every stage.",
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
    title: "Sticky Banners",
    body: "Pinned surfaces keep your product visible while builders browse active categories.",
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

      <main className="overflow-hidden bg-[#f8f9ff] text-[#0b1c30]">
        <section className="relative mx-auto max-w-[1200px] px-4 pb-16 pt-20 text-center sm:px-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(ellipse_at_top,#dce9ff_0%,rgba(248,249,255,0)_68%)] opacity-80"
            aria-hidden
          />

          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0051d5]/10 bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#0051d5]">
              <Sparkles className="size-4" aria-hidden />
              Join 50,000+ builders
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
                <Link href={MEMBER_PRODUCTS_ADD_PATH}>Start for free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto w-full rounded-lg border-[#E2E8F0] bg-white px-8 py-3 text-lg font-semibold text-black shadow-none hover:bg-[#eff4ff] sm:w-auto"
              >
                <Link href={REWARDS_PATH}>Explore rewards</Link>
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

        <section className="bg-[#eff4ff] px-4 py-20 sm:px-6 md:py-24">
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
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjapOwrldNj6uk-KztDRJ2hurjCbcpmt3fj9SGS8au3jHCeswiPt9HGdLCZvwBhQiWKyccVnuqsc8Xh9piBVD0lz8DO2bEroJL20ZtowdNff--ruoVfQdC-fvVUZBKj0u_HJRk82x7UQo3tM7QVqV65AwfWCSpWkjK_u2UZpP3ZowipynC1SDhx54NOPgdvwaruNGwFPWH2lzjl55f_Aj3jMtcNYWrKnclqTp-WEaH9UwZWdOOm_kSEenswqKpxwP9pnJ7vBSvG9la"
                alt="Product analytics dashboard preview with line charts and launch growth metrics."
                width={900}
                height={650}
                sizes="(min-width: 1024px) 560px, calc(100vw - 32px)"
                className="h-full min-h-[320px] w-full object-cover"
                unoptimized
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
