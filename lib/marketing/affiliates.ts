export const SUPADR_AFFILIATE_URL = "https://supadr.com?via=shipyardhq"
export const DODO_AFFILIATE_URL =
  "https://app.dodopayments.com/partners/2yVRZ6fr0p/signup"

export const SUPADR_BADGE_IMAGE_URL =
  "https://supadr.com/api/badge/shipyardhq.dev.svg?theme=orange&template=awards"

export type AffiliateSidebarOffer = {
  id: string
  partnerName: string
  title: string
  description: string
  ctaLabel: string
  href: string
  logoSrc?: string
  logoAlt?: string
  theme?: "brand" | "amber"
}

export const AFFILIATE_SIDEBAR_OFFERS = [
  {
    id: "dodo-payments",
    partnerName: "Dodo Payments",
    title: "Take payments with the provider Shipyard uses",
    description:
      "We process Shipyard billing via Dodo Payments. If you’re shipping a SaaS, it’s a great starting point.",
    ctaLabel: "Get started",
    href: DODO_AFFILIATE_URL,
    logoSrc: "/affiliates/dodo.jpeg",
    logoAlt: "Dodo Payments logo",
    theme: "brand",
  },
  {
    id: "supadr",
    partnerName: "Supadr",
    title: "Add a Domain Rating badge to your site",
    description:
      "Supadr powers the DR badge in Shipyard’s footer — generate yours and add it to your site.",
    ctaLabel: "Create badge",
    href: SUPADR_AFFILIATE_URL,
    logoSrc: "/affiliates/supadr.png",
    logoAlt: "Supadr logo",
    theme: "amber",
  },
] as const satisfies readonly AffiliateSidebarOffer[]
