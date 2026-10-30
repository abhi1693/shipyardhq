export type LaunchChannel = {
  slug: string
  name: string
  audience: string
  acceptedProducts: string
  submission: string
  submitUrl: string
  freeOption: string
  paidOption: string
  limitation: string
  sources: readonly { title: string; url: string }[]
  verifiedAt: string
  editorialStatus: "reviewed" | "draft"
}

// Editorial selection is independent of maker mappings, votes and paid placement.
// Unknown prices and eligibility are explicit; recheck sources before updating.
export const LAUNCH_CHANNELS = [
  {
    slug: "product-hunt",
    name: "Product Hunt",
    audience: "Makers, early adopters, and people discovering new products.",
    acceptedProducts:
      "New products and significant new product iterations; consult its launch guide for the current rules.",
    submission:
      "Sign in, choose Submit, and enter your product URL. Makers can submit their own product.",
    submitUrl: "https://www.producthunt.com/launch",
    freeOption:
      "Its official launch guide states that Product Hunt is free to use.",
    paidOption:
      "Paid advertising terms are not assessed in this comparison; check directly before buying promotion.",
    limitation:
      "Daily voting and comments are part of the launch model. A submission does not establish future traffic or customers.",
    sources: [
      {
        title: "Product Hunt launch guide and FAQs",
        url: "https://www.producthunt.com/launch",
      },
    ],
    verifiedAt: "2026-10-30",
    editorialStatus: "reviewed",
  },
  {
    slug: "betalist",
    name: "BetaList",
    audience: "People looking for early-stage startups.",
    acceptedProducts:
      "Early-stage startups; confirm the current eligibility rules for your product.",
    submission:
      "Start with your website URL and email, then review the submission and select a plan.",
    submitUrl: "https://betalist.com/submissions/new",
    freeOption:
      "A free submission option was not verified in the public submission form.",
    paidOption:
      "The submission flow asks you to choose a plan. Current prices and placement terms were not verified; check before paying.",
    limitation:
      "The public form does not establish acceptance criteria, a publication date, or a traffic result for your startup.",
    sources: [
      {
        title: "BetaList's early-stage startup directory",
        url: "https://betalist.com/",
      },
      {
        title: "BetaList startup submission",
        url: "https://betalist.com/submissions/new",
      },
    ],
    verifiedAt: "2026-10-30",
    editorialStatus: "reviewed",
  },
  {
    slug: "uneed",
    name: "Uneed",
    audience:
      "People exploring tech products across development, design, marketing, business, and personal use.",
    acceptedProducts:
      "Tech products; check the platform's current submission requirements.",
    submission:
      "Enter a product name and website URL to preview a listing, then create an account to save it.",
    submitUrl: "https://www.uneed.best/submit-a-tool",
    freeOption:
      "You can start a preview without an account. Whether publication is free was not verified from that form.",
    paidOption:
      "Current prices, promotion windows, and package terms were not verified; review Uneed's pricing before buying.",
    limitation:
      "A listing preview is not a published launch. We do not treat backlink or visibility marketing claims as guaranteed search rankings or sales.",
    sources: [
      {
        title: "Uneed product submission form",
        url: "https://www.uneed.best/submit-a-tool",
      },
    ],
    verifiedAt: "2026-10-30",
    editorialStatus: "reviewed",
  },
] as const satisfies readonly LaunchChannel[]

export function getReviewedLaunchChannels(
  channels: readonly LaunchChannel[] = LAUNCH_CHANNELS,
) {
  return channels.filter(
    (channel) =>
      channel.editorialStatus === "reviewed" &&
      channel.sources.length > 0 &&
      Boolean(channel.verifiedAt),
  )
}

export function isReviewedLaunchComparison(slug: string) {
  return slug === "product-hunt" && getReviewedLaunchChannels().length > 1
}
