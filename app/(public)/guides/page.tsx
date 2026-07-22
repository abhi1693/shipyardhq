import Link from "next/link"
import { ArrowRight, BookOpenCheck } from "lucide-react"
import { JsonLdScript } from "next-seo"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { GUIDES } from "@/lib/guides/catalog"
import { buildPageMetadata } from "@/lib/metadata"
import { GUIDES_PATH, HOME_PATH, guidePath } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"

const PAGE_TITLE = "Product Launch and Startup SEO Guides"
const PAGE_DESCRIPTION =
  "Practical guides for submitting products to directories, planning an app launch, earning startup backlinks, and building search visibility."

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: GUIDES_PATH,
})

export default function GuidesPage() {
  const siteUrl = resolveSiteUrl()
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: guide.title,
      url: `${siteUrl}${guidePath(guide.slug)}`,
    })),
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="guides"
        webPage={{
          path: GUIDES_PATH,
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "Guides", path: GUIDES_PATH },
          ],
        }}
      />
      <JsonLdScript data={itemList} scriptKey="guides-item-list" />

      <section className="bg-[#061d31] px-4 py-16 text-center text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <BookOpenCheck
            className="mx-auto size-10 text-[#c0ff00]"
            aria-hidden
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#c0ff00]">
            Founder learning center
          </p>
          <h1 className="mt-4 text-balance text-4xl font-bold md:text-6xl">
            Product launch and startup SEO guides
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-8 text-[#d0e4ff]/85 md:text-lg">
            Clear, practical guidance for launching an app, choosing product
            directories, earning relevant backlinks, and turning discovery into
            real users—without ranking guarantees or technical overload.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-14 md:px-6">
        <section>
          <h2 className="text-3xl font-bold text-black">Start with a guide</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#43474c]">
            Each guide includes a direct answer, a step-by-step plan, a useful
            checklist, and plain-language answers to common founder questions.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <article
                key={guide.slug}
                className="flex flex-col rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
                  {guide.eyebrow}
                </p>
                <h2 className="mt-3 text-balance text-xl font-bold text-black">
                  {guide.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#43474c]">
                  {guide.metaDescription}
                </p>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748b]">
                    {guide.readingTime}
                  </span>
                  <Link
                    href={guidePath(guide.slug)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5] hover:underline"
                  >
                    Read guide
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Useful before searchable",
              body: "Every guide starts with the question a founder is trying to answer, then adds examples, decisions, and limits that make the advice usable.",
            },
            {
              title: "Honest about backlinks",
              body: "We explain ordinary, nofollow, and sponsored links clearly. Shipyard does not promise a Google ranking or Domain Rating increase.",
            },
            {
              title: "Written for working founders",
              body: "You do not need to be an SEO specialist or developer. The checklists focus on product facts, audience fit, trust, and measurable outcomes.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-xl bg-[#eef5ff] p-6">
              <h2 className="font-bold text-[#0b1c30]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#43474c]">
                {item.body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
