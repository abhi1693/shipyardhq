"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"

import type { FreeToolSlug } from "@/lib/tools/types"

const TOOL_WORKSPACES = {
  "serp-preview-meta-tag-generator": dynamic(() =>
    import("@/components/organisms/tools/SerpPreviewTool").then(
      (module) => module.SerpPreviewTool,
    ),
  ),
  "open-graph-social-preview-generator": dynamic(() =>
    import("@/components/organisms/tools/OpenGraphSocialPreviewGeneratorTool").then(
      (module) => module.OpenGraphSocialPreviewGeneratorTool,
    ),
  ),
  "startup-keyword-generator": dynamic(() =>
    import("@/components/organisms/tools/StartupKeywordGeneratorTool").then(
      (module) => module.StartupKeywordGeneratorTool,
    ),
  ),
  "product-description-seo-grader": dynamic(() =>
    import("@/components/organisms/tools/ProductDescriptionSeoGraderTool").then(
      (module) => module.ProductDescriptionSeoGraderTool,
    ),
  ),
  "seo-url-slug-generator": dynamic(() =>
    import("@/components/organisms/tools/SeoUrlSlugGeneratorTool").then(
      (module) => module.SeoUrlSlugGeneratorTool,
    ),
  ),
  "product-screenshot-alt-text-generator": dynamic(() =>
    import("@/components/organisms/tools/ScreenshotAltTextGeneratorTool").then(
      (module) => module.ScreenshotAltTextGeneratorTool,
    ),
  ),
  "startup-faq-schema-generator": dynamic(() =>
    import("@/components/organisms/tools/StartupFaqSchemaGeneratorTool").then(
      (module) => module.StartupFaqSchemaGeneratorTool,
    ),
  ),
  "software-application-schema-generator": dynamic(() =>
    import("@/components/organisms/tools/SoftwareApplicationSchemaGeneratorTool").then(
      (module) => module.SoftwareApplicationSchemaGeneratorTool,
    ),
  ),
  "robots-txt-ai-crawler-generator": dynamic(() =>
    import("@/components/organisms/tools/RobotsTxtAiCrawlerGeneratorTool").then(
      (module) => module.RobotsTxtAiCrawlerGeneratorTool,
    ),
  ),
  "xml-sitemap-generator": dynamic(() =>
    import("@/components/organisms/tools/XmlSitemapGeneratorTool").then(
      (module) => module.XmlSitemapGeneratorTool,
    ),
  ),
  "seo-audit": dynamic(() =>
    import("@/components/organisms/tools/SeoAuditTools").then(
      (module) => module.SeoAuditTool,
    ),
  ),
  "bulk-seo-audit": dynamic(() =>
    import("@/components/organisms/tools/SeoAuditTools").then(
      (module) => module.BulkSeoAuditTool,
    ),
  ),
  "seo-comparison": dynamic(() =>
    import("@/components/organisms/tools/SeoAuditTools").then(
      (module) => module.SeoComparisonTool,
    ),
  ),
  "schema-markup-generator": dynamic(() =>
    import("@/components/organisms/tools/SchemaMarkupGeneratorTool").then(
      (module) => module.SchemaMarkupGeneratorTool,
    ),
  ),
  "core-web-vitals-checker": dynamic(() =>
    import("@/components/organisms/tools/CoreWebVitalsTool").then(
      (module) => module.CoreWebVitalsTool,
    ),
  ),
  "meta-tag-generator": dynamic(() =>
    import("@/components/organisms/tools/MetaTagGeneratorTool").then(
      (module) => module.MetaTagGeneratorTool,
    ),
  ),
  "hreflang-generator": dynamic(() =>
    import("@/components/organisms/tools/HreflangGeneratorTool").then(
      (module) => module.HreflangGeneratorTool,
    ),
  ),
  "keyword-density-checker": dynamic(() =>
    import("@/components/organisms/tools/TextAnalysisTools").then(
      (module) => module.KeywordDensityTool,
    ),
  ),
  "redirect-generator": dynamic(() =>
    import("@/components/organisms/tools/RedirectGeneratorTool").then(
      (module) => module.RedirectGeneratorTool,
    ),
  ),
  "disavow-file-generator": dynamic(() =>
    import("@/components/organisms/tools/DisavowFileGeneratorTool").then(
      (module) => module.DisavowFileGeneratorTool,
    ),
  ),
  "word-counter": dynamic(() =>
    import("@/components/organisms/tools/TextAnalysisTools").then(
      (module) => module.WordCounterTool,
    ),
  ),
  "utm-builder": dynamic(() =>
    import("@/components/organisms/tools/UtmBuilderTool").then(
      (module) => module.UtmBuilderTool,
    ),
  ),
  "seo-audit-checklist": dynamic(() =>
    import("@/components/organisms/tools/SeoAuditChecklistTool").then(
      (module) => module.SeoAuditChecklistTool,
    ),
  ),
} satisfies Record<FreeToolSlug, ComponentType>

export function ToolWorkspace({ slug }: { slug: FreeToolSlug }) {
  const Workspace = TOOL_WORKSPACES[slug]
  return <Workspace />
}
