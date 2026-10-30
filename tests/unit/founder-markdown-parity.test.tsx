import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({ plans: [] as unknown[] }))
vi.mock("@/actions/public/plans/actions", () => ({
  getPublicPlans: async () => fixture.plans,
}))
import { dualmarkConfig } from "@/lib/dualmark"
import {
  EDITORIAL_STANDARDS,
  PRICING_FAQS,
  PUBLISHING_PRINCIPLES,
} from "@/lib/founder/content"
import { renderFounderMarkdown } from "@/lib/founder/markdown"
import { PricingTable } from "@/components/organisms/PricingTable"
import AboutPage from "@/app/(public)/about/page"
import EditorialPolicyPage from "@/app/(public)/editorial-policy/page"
import { buildProductMarkdownDocument } from "@/lib/server/productMarkdownDocument"
import type { PublicPlan } from "@/actions/public/plans/actions"

const plans = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    type: "one_time_price",
    price: 0,
    features: [],
    boostForDays: 1,
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    type: "one_time_price",
    price: 9700,
    discount: 0,
    boostForDays: 21,
    features: [
      {
        id: "ai",
        name: "AI readiness",
        key: "product.aiSearchReady",
        enabled: true,
      },
    ],
  },
] as unknown as PublicPlan[]
const plain = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent!

describe("founder Markdown parity", () => {
  it("uses current offer data for both pricing and Markdown without copied prices", async () => {
    fixture.plans = plans
    const page = dualmarkConfig.staticPages.find(
      (page) => page.pattern === "/pricing",
    )!
    const markdown = await page.render()
    const html = plain(renderToStaticMarkup(<PricingTable plans={plans} />))
    expect(markdown).toContain("$97 one-time / product")
    expect(markdown).toContain("Placement window: 21 days")
    expect(markdown).toContain("One-time boosts do not renew automatically")
    expect(html).toContain("$97")
    expect(markdown).toContain("readiness badge + listing-readiness checklist")
    const changed = plans.map((plan) =>
      plan.id === "pro" ? { ...plan, price: 14900 } : plan,
    )
    fixture.plans = changed
    expect(await page.render()).toContain("$149 one-time / product")
    expect(
      plain(renderToStaticMarkup(<PricingTable plans={changed} />)),
    ).toContain("$149")
    for (const faq of PRICING_FAQS) expect(markdown).toContain(faq.answer)
  })
  it("shares publishing principles and review standards with HTML", () => {
    const aboutHtml = plain(renderToStaticMarkup(<AboutPage />))
    const editorialHtml = plain(renderToStaticMarkup(<EditorialPolicyPage />))
    for (const principle of PUBLISHING_PRINCIPLES) {
      expect(aboutHtml).toContain(principle.body)
      expect(renderFounderMarkdown("/about")).toContain(principle.body)
    }
    for (const standard of EDITORIAL_STANDARDS) {
      expect(editorialHtml).toContain(standard.body)
      expect(renderFounderMarkdown("/editorial-policy")).toContain(
        standard.body,
      )
    }
  })
  it("keeps all four founder registrations substantive with canonical references", async () => {
    fixture.plans = plans
    for (const path of [
      "/pricing",
      "/why-shipyard",
      "/about",
      "/editorial-policy",
    ]) {
      const page = dualmarkConfig.staticPages.find(
        (page) => page.pattern === path,
      )!
      const text = await page.render()
      expect(text.length).toBeGreaterThan(700)
      expect(text).toContain(`Canonical: http://localhost:3000${path}`)
    }
    const why = renderFounderMarkdown("/why-shipyard", plans)
    expect(why).toContain("BetaList")
    expect(why).toContain("Sources checked: 2026-10-30")
    expect(why).toContain("not verified")
  })
  it("retains ordinary product Markdown and adds only the actual paid checklist", () => {
    const product = {
      slug: "fixture",
      name: "Fixture",
      description: "A fixture description",
    }
    const meta = { slug: "fixture", name: "Fixture" }
    const free = buildProductMarkdownDocument(product, meta)
    const paid = buildProductMarkdownDocument(
      {
        ...product,
        plan: {
          assignments: [
            { enabled: true, feature: { key: "product.aiSearchReady" } },
          ],
        },
      },
      meta,
    )
    for (const text of [free, paid])
      expect(text).toContain("## Description\n\nA fixture description")
    expect(free).not.toContain("## AI Search Profile")
    expect(paid).toContain("## AI Search Profile\n\nOrdinary listings")
    expect(paid).toContain("Description: present")
    expect(paid).toContain("Tagline: not provided")
    expect(paid).toContain("does not guarantee rankings or AI citations")
    expect(paid).not.toContain("Product schema: enabled")
  })
})
