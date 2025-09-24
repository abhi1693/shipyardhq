export const siteConfig = {
  name: "ShipYardHQ",
  tagline: "Launch faster. Get discovered sooner.",
  description:
    "ShipYardHQ is a curated hub for micro-SaaS, indie tools, and early-stage products. Submit your product in minutes to reach builders and early adopters.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/opengraph.png",
}

export const absoluteOgImageUrl = new URL(
  siteConfig.ogImage,
  siteConfig.url,
).toString()

export const buildSiteSeo = () => {
  const defaultTitle = `${siteConfig.name} — ${siteConfig.tagline}`

  return {
    defaultTitle,
    titleTemplate: `%s | ${siteConfig.name}`,
    description: siteConfig.description,
    openGraph: {
      title: defaultTitle,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteOgImageUrl,
          alt: `${siteConfig.name} brand mark`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: defaultTitle,
      description: siteConfig.description,
      images: [absoluteOgImageUrl],
    },
  }
}
