import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { JsonLdScript } from "next-seo"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { ToolPageShell } from "@/components/templates/public/tools"
import { ToolWorkspace } from "@/components/templates/public/tools/ToolWorkspace"
import { BRAND_NAME } from "@/lib/brand"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, TOOLS_PATH } from "@/lib/routes"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildWebApplicationStructuredData } from "@/lib/seo/web-application"
import { FREE_SEO_TOOLS, freeToolPath, getFreeTool } from "@/lib/tools/catalog"

type ToolPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FREE_SEO_TOOLS.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = getFreeTool(slug)
  if (!tool) return {}

  return buildPageMetadata({
    title: tool.seoTitle ?? tool.name,
    section: "Free SEO Tools",
    description: tool.metaDescription,
    canonical: freeToolPath(tool.slug),
  })
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params
  const tool = getFreeTool(slug)
  if (!tool) notFound()

  const path = freeToolPath(tool.slug)
  const webApplication = buildWebApplicationStructuredData({
    path,
    name: tool.name,
    description: tool.metaDescription,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    browserRequirements: "JavaScript enabled",
    featureList: [...tool.features],
    isAccessibleForFree: true,
    inLanguage: "en",
    offers: { price: 0, priceCurrency: "USD" },
    author: { type: "Organization", name: BRAND_NAME, url: HOME_PATH },
  })
  const faq = buildFaqStructuredData([...tool.faqs], { pageUrl: path })

  return (
    <ToolPageShell
      tool={tool}
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix={`tool-${tool.slug}`}
            webPage={{
              path,
              name: tool.name,
              description: tool.metaDescription,
              keywords: [
                tool.shortName,
                `free ${tool.shortName}`,
                tool.category,
                ...tool.features,
              ],
              mainEntity: {
                type: "WebApplication",
                id: webApplication["@id"],
              },
            }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: "Free SEO Tools", path: TOOLS_PATH },
                { name: tool.name, path },
              ],
            }}
          />
          <JsonLdScript
            data={webApplication}
            scriptKey={`tool-${tool.slug}-webapplication-jsonld`}
          />
          <JsonLdScript data={faq} scriptKey={`tool-${tool.slug}-faq-jsonld`} />
        </>
      }
    >
      <ToolWorkspace slug={tool.slug} />
    </ToolPageShell>
  )
}
