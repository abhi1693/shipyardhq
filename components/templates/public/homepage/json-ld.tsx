import { siteConfig } from "@/lib/siteConfig"
import { BROWSE_PATH } from "@/lib/routes"

export function HomepageJsonLd() {
  const siteUrl = siteConfig.url.replace(/\/$/, "")
  const homepageTitle = `Launch Faster, Get Discovered. Submit Your Product | ${siteConfig.name}`

  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}${BROWSE_PATH}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: homepageTitle,
      description: siteConfig.description,
      url: siteUrl,
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteUrl,
      },
      inLanguage: "en-US",
      mainEntityOfPage: siteUrl,
    },
  ])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  )
}
