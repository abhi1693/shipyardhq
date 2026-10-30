import type { PublicPlan } from "@/actions/public/plans/actions"
import {
  EDITORIAL_STANDARDS,
  PRICING_FAQS,
  PUBLISHING_PRINCIPLES,
} from "@/lib/founder/content"
import { getReviewedLaunchChannels } from "@/lib/launch-channels/catalog"
import {
  formatPricingOfferPrice,
  getDiscountedPriceCents,
  getPricingOfferPresentation,
} from "@/lib/pricing/offer"
import {
  ABOUT_PATH,
  EDITORIAL_POLICY_PATH,
  PRICING_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"

export type FounderMarkdownPath =
  | typeof ABOUT_PATH
  | typeof EDITORIAL_POLICY_PATH
  | typeof PRICING_PATH
  | typeof WHY_SHIPYARD_PATH

export function renderPlanFactsMarkdown(plans: PublicPlan[]) {
  if (!plans.length)
    return [
      "The current plan catalog is unavailable. Check the pricing page before choosing a plan.",
    ]
  return plans.flatMap((plan) => [
    `### ${plan.name}`,
    "",
    plan.price <= 0
      ? "Price: Free"
      : `Price: ${formatPricingOfferPrice(getDiscountedPriceCents(plan))} ${plan.type === "recurring_price" ? `${plan.priceSuffix ?? "recurring"} / product` : "one-time / product"}`,
    ...(plan.price > 0 ? [`Placement window: ${plan.boostForDays} days.`] : []),
    "",
    ...getPricingOfferPresentation(plan, plans).items.map(
      (item) => `- ${item.label}`,
    ),
    "",
  ])
}

export function renderFounderMarkdown(
  path: FounderMarkdownPath,
  plans: PublicPlan[] = [],
) {
  const titles = {
    [ABOUT_PATH]: "About Shipyard HQ",
    [EDITORIAL_POLICY_PATH]: "Editorial and listing standards",
    [PRICING_PATH]: "Pricing",
    [WHY_SHIPYARD_PATH]: "Why launch on Shipyard HQ",
  }
  const sections = [`# ${titles[path]}`, ""]
  if (path === ABOUT_PATH)
    sections.push(
      "Shipyard HQ is an independent product launch directory and discovery platform for indie makers, founders, and people comparing new tools.",
      "",
      "Product claims normally come from the maker. Shipyard provides directory organization, discovery surfaces, rankings, and clearly labeled paid placement.",
      "",
      ...PUBLISHING_PRINCIPLES.flatMap((principle) => [
        `## ${principle.title}`,
        "",
        principle.body,
        "",
      ]),
      `Read the [editorial and listing standards](${new URL(EDITORIAL_POLICY_PATH, resolveSiteUrl())}).`,
      "",
    )
  if (path === EDITORIAL_POLICY_PATH)
    sections.push(
      "Product facts are normally submitted or confirmed by the maker. The Shipyard HQ Editorial Team maintains founder guides and explanatory pages. Commercial placement does not buy editorial endorsement.",
      "",
      ...EDITORIAL_STANDARDS.flatMap((standard) => [
        `## ${standard.title}`,
        "",
        standard.body,
        "",
      ]),
      "## Corrections and removals",
      "",
      "Email support@shipyardhq.dev with the page URL, the specific issue, and supporting evidence. Shipyard may correct, limit, archive, or remove content when appropriate.",
      "",
      "Paid direct links use sponsored qualification. Shipyard does not guarantee Domain Rating increases, do-follow backlinks, search rankings, or AI citations.",
      "",
    )
  if (path === PRICING_PATH || path === WHY_SHIPYARD_PATH)
    sections.push(
      "## Free listings and optional promotion",
      "",
      "Save product details as a private draft, then choose a plan to publish. Free publication needs no checkout; paid promotion starts after verified payment. A listing can remain public on the free plan after a paid placement ends, subject to listing rules.",
      "",
      ...renderPlanFactsMarkdown(plans),
      "## Billing and placement terms",
      "",
      "One-time boosts do not renew automatically. Recurring plans renew on their stated cadence until canceled. Paid placement is eligibility for the stated surfaces, not a guaranteed traffic volume or ranking.",
      "",
      "Free listings record website clicks through a redirect. Eligible paid listings use a direct sponsored link with click tracking. Website-click counts are lifetime aggregates and may include repeated or automated activity; they do not establish signups or customers. Cloudflare traffic is raw zone HTTP data, not unique people or qualified buyers.",
      "",
      ...PRICING_FAQS.flatMap((faq) => [
        `### ${faq.question}`,
        "",
        faq.answer,
        "",
      ]),
    )
  if (path === WHY_SHIPYARD_PATH)
    sections.push(
      "## Reviewed launch-channel comparison",
      "",
      "Selection is based on public submission flows and primary sources, independently of maker mappings, votes, or paid placement. Shipyard publishes this comparison and sells optional promotion. No channel guarantees customers or search rankings.",
      "",
      ...getReviewedLaunchChannels().flatMap((channel) => [
        `### ${channel.name}`,
        "",
        `Audience: ${channel.audience}`,
        `Products: ${channel.acceptedProducts}`,
        `Submission: ${channel.submission}`,
        `Free option: ${channel.freeOption}`,
        `Paid option: ${channel.paidOption}`,
        `Limitations: ${channel.limitation}`,
        `Sources checked: ${channel.verifiedAt}`,
        ...channel.sources.map(
          (source) => `- [${source.title}](${source.url})`,
        ),
        "",
      ]),
    )
  sections.push(`Canonical: ${new URL(path, resolveSiteUrl())}`)
  return sections.join("\n")
}
