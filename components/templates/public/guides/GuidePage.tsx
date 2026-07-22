import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { JsonLdScript } from "next-seo"

import { Button } from "@/components/atoms/button"
import { GoogleAdsenseDisplayUnit } from "@/components/molecules/GoogleAdsenseUnit"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import type { GuideDefinition } from "@/lib/guides/catalog"
import { getGuide } from "@/lib/guides/catalog"
import {
  EDITORIAL_POLICY_PATH,
  GUIDES_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  guidePath,
} from "@/lib/routes"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { siteConfig } from "@/lib/siteConfig"

export function GuidePage({ guide }: { guide: GuideDefinition }) {
  const path = guidePath(guide.slug)
  const pageUrl = new URL(path, siteConfig.url).toString()
  const relatedGuides = guide.relatedSlugs
    .map((slug) => getGuide(slug))
    .filter((item) => item !== undefined)
  const faq = buildFaqStructuredData(guide.faqs, { pageUrl: path })
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: pageUrl,
    author: {
      "@type": "Organization",
      name: "Shipyard HQ Editorial Team",
      url: new URL(EDITORIAL_POLICY_PATH, siteConfig.url).toString(),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: new URL(siteConfig.logo, siteConfig.url).toString(),
      },
    },
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix={`guide-${guide.slug}`}
        webPage={{
          path,
          name: guide.title,
          description: guide.metaDescription,
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "Guides", path: GUIDES_PATH },
            { name: guide.title, path },
          ],
        }}
      />
      <JsonLdScript data={article} scriptKey={`guide-${guide.slug}-article`} />
      <JsonLdScript data={faq} scriptKey={`guide-${guide.slug}-faq`} />

      <header className="bg-[#061d31] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-[1000px]">
          <Link
            href={GUIDES_PATH}
            className="text-sm font-semibold text-[#c0ff00] hover:underline"
          >
            Founder guides
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-[#c0ff00]">
            {guide.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-bold leading-tight md:text-6xl">
            {guide.title}
          </h1>
          <p className="mt-6 max-w-3xl text-pretty text-base leading-8 text-[#d0e4ff]/85 md:text-lg">
            {guide.lede}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#d0e4ff]/70">
            <span>By Shipyard HQ Editorial Team</span>
            <time dateTime={guide.updatedAt}>Updated July 22, 2026</time>
            <span>{guide.readingTime}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <section className="rounded-xl border border-[#b8d1f5] bg-[#eef5ff] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0051d5]">
              The short answer
            </p>
            <p className="mt-3 text-pretty text-lg font-medium leading-8 text-[#0b1c30]">
              {guide.directAnswer}
            </p>
          </section>

          <nav
            aria-label="Guide contents"
            className="mt-8 rounded-xl border border-[#e2e8f0] bg-white p-6"
          >
            <h2 className="font-bold">In this guide</h2>
            <ol className="mt-4 grid gap-2 md:grid-cols-2">
              {guide.sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm leading-6 text-[#0051d5] hover:underline"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-12">
            {guide.sections.map((section, index) => (
              <div key={section.id}>
                <section id={section.id} className="scroll-mt-24">
                  <h2 className="text-balance text-2xl font-bold text-black md:text-3xl">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-4 text-pretty text-base leading-8 text-[#43474c]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <ul className="mt-6 space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-6">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 text-sm leading-6 text-[#43474c]"
                        >
                          <CheckCircle2
                            className="mt-0.5 size-5 shrink-0 text-[#15803d]"
                            aria-hidden
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                {index === 2 ? (
                  <GoogleAdsenseDisplayUnit className="mt-12 min-h-24 rounded-xl border border-[#e2e8f0] bg-white p-3" />
                ) : null}
              </div>
            ))}
          </div>

          <section className="mt-14 border-t border-[#e2e8f0] pt-12">
            <h2 className="text-3xl font-bold text-black">
              Frequently asked questions
            </h2>
            <div className="mt-6 space-y-4">
              {guide.faqs.map((item) => (
                <article
                  key={item.question}
                  className="rounded-xl border border-[#e2e8f0] bg-white p-6"
                >
                  <h3 className="font-semibold text-[#0b1c30]">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#43474c]">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-xl bg-[#061d31] p-8 text-white">
            <h2 className="text-2xl font-bold">Put the guide into practice</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d0e4ff]/80">
              Create a free Shipyard product page, add complete launch details,
              and start building relevant directory discovery without paying for
              a standard listing.
            </p>
            <Button
              asChild
              className="mt-6 bg-[#c0ff00] text-black hover:bg-[#d6ff47]"
            >
              <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                Submit your product
              </Link>
            </Button>
          </section>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <h2 className="text-sm font-bold">How we write these guides</h2>
            <p className="mt-2 text-sm leading-6 text-[#43474c]">
              Shipyard separates founder education, directory data, and paid
              promotion. We explain limitations and do not promise rankings or
              authority scores.
            </p>
            <Link
              href={EDITORIAL_POLICY_PATH}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5] hover:underline"
            >
              Read our editorial policy
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <h2 className="text-sm font-bold">Related founder guides</h2>
            <div className="mt-4 space-y-4">
              {relatedGuides.map((related) => (
                <Link
                  key={related.slug}
                  href={guidePath(related.slug)}
                  className="group block"
                >
                  <span className="block text-sm font-semibold text-[#0b1c30] group-hover:text-[#0051d5]">
                    {related.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#43474c]">
                    {related.metaDescription}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
