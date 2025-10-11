export const siteConfig = {
  name: "ShipYardHQ",
  tagline: "The Product Hunt alternative where builders ship together.",
  description:
    "ShipYardHQ is the Product Hunt alternative for indie hackers and micro-SaaS teams to ship in public, share progress, and rally their first customers through ongoing launches.",
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
