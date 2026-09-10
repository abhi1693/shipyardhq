import Link from "next/link"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { BRAND_NAME } from "@/lib/brand"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ABOUT_PATH,
  EDITORIAL_POLICY_PATH,
  GUIDES_PATH,
  HOME_PATH,
} from "@/lib/routes"

const PAGE_TITLE = "Editorial and Listing Standards"
const PAGE_DESCRIPTION =
  "How Shipyard reviews product listings, labels sponsored placement, builds rankings and guides, handles links, and corrects inaccurate content."

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: EDITORIAL_POLICY_PATH,
})

const STANDARDS = [
  {
    title: "Complete and specific",
    body: "A useful listing identifies the product, intended audience, main outcome, pricing model, platforms, and maker. Thin, misleading, copied, or unfinished submissions may be limited, corrected, or removed.",
  },
  {
    title: "Accurate over promotional",
    body: "Claims should match the product's public website or information supplied by its maker. Unsupported superlatives, fake customer claims, and misleading category assignments are not editorial facts.",
  },
  {
    title: "Commercial influence disclosed",
    body: "Sponsored cards, priority placement, direct paid links, and partner panels are labelled or described as paid features. Payment does not buy a positive review or hidden endorsement.",
  },
  {
    title: "Corrections are welcome",
    body: "Makers can update listings, and readers can report a specific inaccurate fact or broken page. Shipyard reviews the cited evidence and updates public information when a correction is justified.",
  },
]

export default function EditorialPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="editorial-policy"
        webPage={{
          path: EDITORIAL_POLICY_PATH,
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: EDITORIAL_POLICY_PATH },
          ],
        }}
      />

      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c0ff00]">
            Trust and transparency
          </p>
          <h1 className="mt-4 text-balance text-4xl font-bold md:text-6xl">
            Editorial and listing standards
          </h1>
          <p className="mt-6 max-w-3xl text-pretty text-base leading-8 text-[#d0e4ff]/85 md:text-lg">
            These standards explain where Shipyard content comes from, how
            directory and ranking pages are organized, how commercial placement
            is labelled, and how readers or makers can request a correction.
          </p>
          <p className="mt-5 text-sm text-[#d0e4ff]/65">
            Last updated: September 8, 2026
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-[900px] space-y-12 px-4 py-14 md:px-6">
        <section>
          <h2 className="text-3xl font-bold text-black">
            Our publishing model
          </h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              {BRAND_NAME} publishes several kinds of content. Product names,
              descriptions, screenshots, pricing details, links, and maker
              information are normally submitted or confirmed by the maker.
              Shipyard supplies the public page design, directory organization,
              ranking signals, badges, verification status, and discovery data.
            </p>
            <p>
              Founder guides and explanatory pages are written and maintained by
              the Shipyard HQ Editorial Team. They are intended to answer a
              practical question in clear language. We review them for useful
              structure, factual limitations, commercial disclosure, and
              consistency with the way the platform actually works.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {STANDARDS.map((standard) => (
            <div
              key={standard.title}
              className="rounded-xl border border-[#e2e8f0] bg-white p-6"
            >
              <h2 className="text-lg font-bold text-[#0b1c30]">
                {standard.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#43474c]">
                {standard.body}
              </p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-black">
            Product submissions and review
          </h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              Makers are responsible for having the right to publish their
              submitted text and media. Listings should describe an accessible
              product or a clearly identified pre-launch project. Shipyard may
              normalize formatting, categories, tags, platform labels, or
              metadata so the listing works consistently across directory pages.
            </p>
            <p>
              Verification means Shipyard has a stronger maker, ownership, or
              profile signal than a basic listing; it is not a guarantee of
              product quality, security, financial performance, or suitability.
              Editor's Pick badges are separate curation signals and should not
              be confused with paid placement.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-black">
            Rankings and directory ordering
          </h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              Directory pages use published product data such as category, use
              case, pricing model, platform, product type, verification, badges,
              freshness, votes, and eligible launch activity. Leaderboards use
              documented Shipyard signals for the relevant period. Sorting can
              change when a visitor chooses newest, trending, votes, or name.
            </p>
            <p>
              Some paid plans include priority or sponsored placement. Those
              positions are commercial inventory, not an editorial conclusion
              that the product is best. Shipyard labels sponsored cards and
              describes paid visibility in its pricing information.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[#b8d1f5] bg-[#eef5ff] p-7">
          <h2 className="text-2xl font-bold text-black">Link and SEO policy</h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              An ordinary link is sometimes called a do-follow link. Paid or
              commercially influenced links should be disclosed to search
              engines, so Shipyard marks paid direct website links as sponsored.
              The link can still create useful referral traffic and a simple
              path from discovery to the product.
            </p>
            <p>
              Shipyard does not guarantee rankings, indexing, backlinks, Domain
              Rating, Domain Authority, or traffic. Authority scores come from
              third-party SEO tools and are not Google scores. We encourage
              founders to earn references through useful products, original
              resources, accurate directory profiles, partnerships, and real
              customer advocacy.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-black">
            Advertising and independence
          </h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              Carbon Ads appears in dedicated placements on our homepage,
              browse, taxonomy directory, product, and leaderboard pages. Our
              own sponsored launch placements remain clearly identified. Ads do
              not determine which products are accepted, verified, ranked, or
              selected by editors.
            </p>
            <p>
              {BRAND_NAME} is independent and is not affiliated with Product
              Hunt or listed products unless a relationship is clearly stated.
              Comparisons and references to other platforms are descriptive, not
              claims of endorsement.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-black">
            Corrections, complaints, and removals
          </h2>
          <p className="mt-5 text-base leading-8 text-[#43474c]">
            To report an inaccurate fact, copied content, ownership issue,
            broken product, undisclosed conflict, or policy concern, email{" "}
            <a
              href="mailto:support@shipyardhq.dev"
              className="font-semibold text-[#0051d5] hover:underline"
            >
              support@shipyardhq.dev
            </a>{" "}
            with the page URL, the specific issue, and supporting evidence.
            Shipyard reviews the cited material and may correct, limit, archive,
            or remove content when appropriate.
          </p>
        </section>

        <nav className="flex flex-wrap gap-5 border-t border-[#e2e8f0] pt-8 text-sm font-semibold">
          <Link href={ABOUT_PATH} className="text-[#0051d5] hover:underline">
            About Shipyard
          </Link>
          <Link href={GUIDES_PATH} className="text-[#0051d5] hover:underline">
            Founder guides
          </Link>
        </nav>
      </article>
    </main>
  )
}
