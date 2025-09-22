import { SHIPYARD_TWITTER_URL } from "@/lib/routes"

export const EMAIL_BRAND = {
  name: "Shipyard HQ",
  homeUrl: "https://shipyardhq.dev",
  supportEmail: "shipyardhq.dev@gmail.com",
  twitterUrl: SHIPYARD_TWITTER_URL,
  logoAlt: "ShipyardHQ logo",
  logoUrl: "https://shipyardhq.dev/brand-white.png",
}

export type EmailBrand = typeof EMAIL_BRAND
