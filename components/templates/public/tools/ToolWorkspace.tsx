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
} satisfies Record<FreeToolSlug, ComponentType>

export function ToolWorkspace({ slug }: { slug: FreeToolSlug }) {
  const Workspace = TOOL_WORKSPACES[slug]
  return <Workspace />
}
