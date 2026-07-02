import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { JsonLdScript } from "next-seo"

import {
  ALTERNATIVE_DETAIL_PAGE_SIZE,
  getAlternativeDetail,
  getAlternativeProductsPage,
  getAlternativesWithCounts,
  getFeaturedAlternatives,
} from "@/actions/public/alternatives/actions"
import AlternativeProductsClient from "@/app/(public)/alternatives/[slug]/AlternativeProductsClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailSkeleton } from "@/components/templates/public/common/TaxonomyDetailSkeleton"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyTrafficStatsSidebar } from "@/components/templates/public/common/TaxonomyTrafficStatsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import { resolveTaxonomyReferenceDateIso } from "@/components/templates/public/common/TaxonomyProductRows"
import { buildMetaDescription, buildPageMetadata } from "@/lib/metadata"
import {
  ALTERNATIVES_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  alternativePath,
} from "@/lib/routes"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildProductListItem } from "@/lib/seo/product-list"
import { siteConfig } from "@/lib/siteConfig"

interface AlternativeDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const alternatives = await getAlternativesWithCounts()

  return alternatives.map((alternative) => ({
    slug: alternative.slug,
  }))
}

export async function generateMetadata({
  params,
}: AlternativeDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const alternative = await getAlternativeDetail(slug)

  if (!alternative) {
    return {}
  }

  const productsSummary = await getAlternativeProductsPage({
    alternativeId: alternative.id,
    page: 1,
    pageSize: 1,
  })

  const linkedCount = productsSummary.total
  const title =
    linkedCount > 0
      ? `Top ${linkedCount} ${alternative.name} Alternatives & Competitors`
      : `Best ${alternative.name} Alternatives & Competitors`

  const fallbackDescription =
    linkedCount > 0
      ? `Discover the top ${linkedCount} ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders.`
      : `Discover the best ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders.`
  const generatedDescription =
    linkedCount > 0
      ? `Compare ${linkedCount} ${alternative.name} alternatives, competitors, and replacement products curated for founders on Shipyard.`
      : `Compare ${alternative.name} alternatives, competitors, and replacement products curated for founders on Shipyard.`
  const description =
    buildMetaDescription(
      alternative.description,
      generatedDescription,
      fallbackDescription,
    ) ?? fallbackDescription
  const canonical = alternativePath(slug)

  const keywordPhrases = [
    `best ${alternative.name} alternatives`,
    `${alternative.name} competitors`,
    `top tools like ${alternative.name}`,
    `${alternative.name} replacement software`,
    `${alternative.name} alternative platforms`,
    `${alternative.name} competitor comparison`,
  ]

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Alternatives",
    canonical,
    openGraph: {
      url: canonical,
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  })

  return {
    ...metadata,
    keywords: keywordPhrases,
  }
}

export default function AlternativeDetailPage(
  props: AlternativeDetailPageProps,
) {
  return (
    <Suspense fallback={<TaxonomyDetailSkeleton />}>
      <AlternativeDetailPageContent {...props} />
    </Suspense>
  )
}

async function AlternativeDetailPageContent({
  params,
}: AlternativeDetailPageProps) {
  const { slug } = await params

  const alternative = await getAlternativeDetail(slug)
  if (!alternative) {
    notFound()
  }

  const [productsPage, featuredAlternatives, taxonomySponsors] =
    await Promise.all([
      getAlternativeProductsPage({
        alternativeId: alternative.id,
        page: 1,
        pageSize: ALTERNATIVE_DETAIL_PAGE_SIZE,
      }),
      getFeaturedAlternatives({
        excludeId: alternative.id,
        take: 6,
      }),
      getTaxonomySponsorProducts(),
    ])

  const referenceDateIso = resolveTaxonomyReferenceDateIso(productsPage.items)
  const curatedCount =
    productsPage.total > 0 ? Math.min(productsPage.total, 8) : 0
  const description = alternative.description?.trim().length
    ? alternative.description
    : curatedCount
      ? `A curated collection of the ${curatedCount} best alternatives to ${alternative.name}.`
      : `We're curating the best alternatives to ${alternative.name}.`

  const alternativeUrl = new URL(
    alternativePath(alternative.slug),
    siteConfig.url,
  ).toString()
  const websiteUrl = alternative.websiteUrl?.trim()

  const itemListElements = productsPage.items.map((product, index) =>
    buildProductListItem({
      product,
      position: index + 1,
      siteUrl: siteConfig.url,
    }),
  )

  const seoKeywords = [
    `best ${alternative.name} alternatives`,
    `top ${alternative.name} competitors`,
    `tools like ${alternative.name}`,
    `${alternative.name} replacement software`,
    `${alternative.name} alternative platforms`,
    `${alternative.name} similar products`,
  ]

  const structuredDescription =
    productsPage.total > 0
      ? `Compare the top ${productsPage.total} ${alternative.name} alternatives, competitors, and similar tools Shipyard makers rely on.`
      : `Explore curated ${alternative.name} competitors, similar tools, and replacement platforms.`

  const topProductNames = productsPage.items
    .slice(0, 3)
    .map((product) => product.name)
    .filter(Boolean)
  const comparisonFaqs = [
    {
      question: `What are the best alternatives to ${alternative.name}?`,
      answer:
        topProductNames.length > 0
          ? `Shipyard currently maps ${productsPage.total} ${alternative.name} alternatives, including ${topProductNames.join(", ")}. Browse the full list to compare launch traction, positioning, and product details.`
          : `Shipyard is curating ${alternative.name} alternatives as makers submit relevant products and competitors.`,
    },
    {
      question: `How does Shipyard compare ${alternative.name} competitors?`,
      answer: `Shipyard groups products by their alternative mapping, launch metadata, categories, maker-submitted descriptions, and discovery signals so founders can scan comparable products quickly.`,
    },
    {
      question: `Can I submit an alternative to ${alternative.name}?`,
      answer: `Yes. Makers can submit a product to Shipyard, add the relevant alternative mapping, and use promotion tiers when they want extra launch reach.`,
    },
  ]
  const faqStructuredData = buildFaqStructuredData(comparisonFaqs, {
    pageUrl: alternativePath(alternative.slug),
  })
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${alternativeUrl}#itemlist`,
    name: `Products like ${alternative.name}`,
    description: structuredDescription,
    numberOfItems: productsPage.total,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: itemListElements,
  }
  const collectionPageData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${alternativeUrl}#collection`,
    name:
      productsPage.total > 0
        ? `Top ${productsPage.total} ${alternative.name} Alternatives & Competitors`
        : `Best ${alternative.name} Alternatives & Competitors`,
    url: alternativeUrl,
    description: structuredDescription,
    inLanguage: "en-US",
    keywords: seoKeywords.join(", "),
    alternateName: `Best ${alternative.name} alternatives and competitors`,
    about: {
      "@type": "Thing",
      name: alternative.name,
      ...(websiteUrl ? { url: websiteUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      "@id": `${siteConfig.url}#organization`,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: new URL(siteConfig.ogImage, siteConfig.url).toString(),
      },
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: alternativeUrl,
    ...(referenceDateIso ? { dateModified: referenceDateIso } : {}),
    mainEntity: { "@id": `${alternativeUrl}#itemlist` },
    hasPart: faqStructuredData.mainEntity.length
      ? { "@id": `${alternativeUrl}#faq` }
      : undefined,
  }

  return (
    <TaxonomyDetailPage
      title={`Best ${alternative.name} alternatives`}
      description={description}
      icon={
        <AlternativeIcon
          name={alternative.name}
          logoUrl={alternative.logoUrl}
        />
      }
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Submit your alternative",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: ALTERNATIVES_PATH,
        label: "Browse all alternatives",
      }}
      stats={[
        { label: "Mapped Products", value: productsPage.total },
        { label: "Featured", value: featuredAlternatives.length },
        { label: "Alternatives", value: curatedCount },
      ]}
      feed={
        <AlternativeProductsClient
          alternativeId={alternative.id}
          initialItems={productsPage.items}
          initialHasMore={productsPage.hasMore}
          initialPage={productsPage.nextPage ?? 2}
          pageSize={ALTERNATIVE_DETAIL_PAGE_SIZE}
          referenceDateIso={referenceDateIso}
        />
      }
      afterFeed={
        <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
          <h2 className="text-2xl font-bold text-[#0b1c30]">
            Comparing {alternative.name} alternatives
          </h2>
          <div className="mt-5 space-y-5">
            {comparisonFaqs.map((faq) => (
              <div key={faq.question} className="space-y-2">
                <h3 className="text-sm font-semibold text-[#0b1c30]">
                  {faq.question}
                </h3>
                <p className="text-sm leading-6 text-[#43474c]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      }
      feedTestId="alternative-feed-section"
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix={`alternative-${alternative.slug}`}
            webPage={{
              path: alternativePath(alternative.slug),
              name:
                productsPage.total > 0
                  ? `Top ${productsPage.total} ${alternative.name} Alternatives & Competitors`
                  : `Best ${alternative.name} Alternatives & Competitors`,
              description: structuredDescription,
              keywords: seoKeywords,
            }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: "Alternatives", path: ALTERNATIVES_PATH },
                {
                  name: `${alternative.name} Alternatives`,
                  path: alternativePath(alternative.slug),
                },
              ],
            }}
          />
          <JsonLdScript
            data={collectionPageData}
            scriptKey={`alternative-${alternative.slug}-collection-jsonld`}
          />
          <JsonLdScript
            data={itemListData}
            scriptKey={`alternative-${alternative.slug}-itemlist-jsonld`}
          />
          <JsonLdScript
            data={faqStructuredData}
            scriptKey={`alternative-${alternative.slug}-faq-jsonld`}
          />
        </>
      }
      sponsorProducts={taxonomySponsors}
      trafficStats={<TaxonomyTrafficStatsSidebar />}
    />
  )
}

function AlternativeIcon({
  name,
  logoUrl,
}: {
  name: string
  logoUrl?: string | null
}) {
  return (
    <Avatar className="h-10 w-10 rounded-md bg-white">
      {logoUrl ? <AvatarImage src={logoUrl} alt={`${name} logo`} /> : null}
      <AvatarFallback className="rounded-md text-sm font-semibold uppercase text-[#0b1c30]">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return letters || "ALT"
}
