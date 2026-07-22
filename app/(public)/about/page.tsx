import Link from "next/link"

import { Button } from "@/components/atoms/button"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { BRAND_NAME } from "@/lib/brand"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ABOUT_PATH,
  EDITORIAL_POLICY_PATH,
  GUIDES_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"

const PAGE_TITLE = "About Shipyard HQ"
const PAGE_DESCRIPTION =
  "Learn how Shipyard HQ helps founders submit products, build lasting directory discovery, compare launches, and measure product visibility."

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: ABOUT_PATH,
})

const PUBLISHING_PRINCIPLES = [
  {
    title: "Useful product detail",
    body: "Listings should explain what a product does, who it serves, its pricing model, supported platforms, and the people behind it. A name and link alone are not enough.",
  },
  {
    title: "Clear commercial labels",
    body: "Paid visibility is labelled as sponsored or promoted. A payment can improve placement where the plan says it will, but it does not buy an editorial opinion or a guaranteed search result.",
  },
  {
    title: "Lasting discovery",
    body: "Shipyard connects products to useful category, use-case, platform, pricing, alternative, and leaderboard paths so discovery can continue after launch day.",
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="about"
        webPage={{
          path: ABOUT_PATH,
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "About", path: ABOUT_PATH },
          ],
        }}
      />

      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c0ff00]">
            About {BRAND_NAME}
          </p>
          <h1 className="mt-4 text-balance text-4xl font-bold md:text-6xl">
            A product launch directory built for useful, lasting discovery
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-8 text-[#d0e4ff]/85 md:text-lg">
            {BRAND_NAME} helps independent founders and product teams publish
            complete launch pages, appear in relevant product directories, learn
            from discovery signals, and give interested visitors a clear path to
            the product.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1000px] space-y-14 px-4 py-14 md:px-6">
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-black">
              Why Shipyard exists
            </h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
              <p>
                A launch can disappear quickly when every channel is built
                around a single day. Founders still need a permanent page that
                explains the product, appears in the right category, and can be
                updated as the product changes.
              </p>
              <p>
                Shipyard was created as an independent launch and discovery
                platform for apps, SaaS products, APIs, AI tools, open-source
                projects, and other digital products. It can be used alongside
                Product Hunt or as a Product Hunt alternative when a founder
                wants another audience and a longer discovery window.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#b8d1f5] bg-[#eef5ff] p-7">
            <h2 className="text-xl font-bold text-[#0b1c30]">Who it serves</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#43474c]">
              <li>Founders preparing to submit a product or app</li>
              <li>Buyers comparing new software by use case or category</li>
              <li>
                Independent makers building their first discovery channels
              </li>
              <li>
                Product teams measuring launches, votes, and referral interest
              </li>
              <li>
                Writers and researchers looking for structured product facts
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-black">
            What Shipyard publishes
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#43474c]">
            The public site combines maker-submitted product facts, Shipyard
            directory organization, launch and leaderboard signals, free founder
            tools, and original educational guides. Product claims come from the
            maker unless Shipyard clearly says that a badge, ranking, category,
            or editorial selection is a Shipyard signal.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PUBLISHING_PRINCIPLES.map((principle) => (
              <article
                key={principle.title}
                className="rounded-xl border border-[#e2e8f0] bg-white p-6"
              >
                <h3 className="font-bold text-[#0b1c30]">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#43474c]">
                  {principle.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#e2e8f0] bg-white p-7 md:p-9">
          <h2 className="text-2xl font-bold text-black">
            How free listings, paid visibility, and links work
          </h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#43474c]">
            <p>
              A free listing gives a founder a public product page and standard
              eligibility for relevant discovery surfaces. Optional paid plans
              can add clearly described priority placement, sponsor panels,
              analytics, and a direct website link.
            </p>
            <p>
              Paid direct links are marked as sponsored for Google. They can
              still bring relevant visitors to a product, but Shipyard does not
              sell a guaranteed Domain Rating increase, a do-follow backlink, or
              a search ranking. Sustainable search authority comes from a useful
              product, complete public information, earned references, and
              resources that people choose to cite.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href={EDITORIAL_POLICY_PATH}
              className="text-sm font-semibold text-[#0051d5] hover:underline"
            >
              Read the editorial policy
            </Link>
            <Link
              href={WHY_SHIPYARD_PATH}
              className="text-sm font-semibold text-[#0051d5] hover:underline"
            >
              Compare the Shipyard launch model
            </Link>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-black">
              Independent operation
            </h2>
            <p className="mt-4 text-base leading-8 text-[#43474c]">
              {BRAND_NAME} is independently built and operated. It is not
              affiliated with Product Hunt or the products listed in its public
              directory unless a relationship is explicitly disclosed. The team
              maintains the platform, directory structure, ranking systems,
              founder tools, guides, and support process.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">
              Corrections and contact
            </h2>
            <p className="mt-4 text-base leading-8 text-[#43474c]">
              Makers can update their own product information. Anyone can report
              an inaccurate listing, broken page, policy concern, or correction
              by emailing{" "}
              <a
                href="mailto:support@shipyardhq.dev"
                className="font-semibold text-[#0051d5] hover:underline"
              >
                support@shipyardhq.dev
              </a>
              . We review the cited page and the specific fact before making a
              correction.
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-[#061d31] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-bold">
            Ready to launch something useful?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#d0e4ff]/80">
            Start with a complete free listing, or read the founder guides
            before you plan your launch and directory submissions.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="bg-[#c0ff00] text-black hover:bg-[#d6ff47]"
            >
              <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                Submit your product
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={GUIDES_PATH}>Read founder guides</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
