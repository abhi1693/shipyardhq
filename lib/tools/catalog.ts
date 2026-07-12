import {
  FREE_TOOL_SLUGS,
  type FreeToolDefinition,
  type FreeToolSlug,
} from "@/lib/tools/types"
import { TOOLS_PATH, toolPath } from "@/lib/routes"

export const FREE_TOOLS_PATH = TOOLS_PATH

export const freeToolPath = (slug: FreeToolSlug) => toolPath(slug)

export const FREE_SEO_TOOLS: readonly FreeToolDefinition[] = [
  {
    slug: "serp-preview-meta-tag-generator",
    name: "SERP Preview & Meta Tag Generator",
    shortName: "SERP Preview",
    description:
      "Preview how your product page may appear in Google and generate clean title, description, and canonical tags before launch.",
    metaDescription:
      "Preview a product page in Google search and generate SEO title, meta description, and canonical tags with Shipyard's free SERP tool.",
    category: "Search appearance",
    icon: "search",
    resultLabel: "A search snippet preview and copy-ready meta tags",
    features: [
      "Live search-result preview",
      "Title and description length guidance",
      "Copy-ready HTML meta tags",
    ],
    guide: [
      {
        title: "What a SERP preview helps you catch",
        body: "A preview makes it easier to spot vague titles, clipped descriptions, repeated brand names, and URLs that are hard to scan. Search engines can rewrite a snippet, but a clear title and description still give them a strong starting point.",
      },
      {
        title: "Write for founders who are comparing options",
        body: "Lead with the product or category, then make the outcome concrete. Use the description to explain who the product is for and what changes after using it instead of filling the available space with keywords.",
      },
    ],
    faqs: [
      {
        question: "Does Google always use the title and description I provide?",
        answer:
          "No. Google can rewrite either element to better match a search. Accurate, specific metadata still improves the source material available for the result.",
      },
      {
        question: "What should I use as the canonical URL?",
        answer:
          "Use the preferred public URL for the page, including HTTPS and the final hostname. Avoid campaign parameters and alternate versions of the same page.",
      },
      {
        question: "Can I use this for a page that has not launched yet?",
        answer:
          "Yes. Drafting the snippet before launch helps keep the page title, positioning, and announcement copy aligned.",
      },
    ],
    relatedTools: [
      "product-description-seo-grader",
      "seo-url-slug-generator",
      "open-graph-social-preview-generator",
    ],
  },
  {
    slug: "open-graph-social-preview-generator",
    name: "Open Graph & Social Preview Generator",
    shortName: "Social Preview",
    description:
      "See how a launch link can look when shared, then generate the matching Open Graph and X card tags.",
    metaDescription:
      "Preview your product link on social platforms and generate Open Graph and X card tags with Shipyard's free social preview tool.",
    category: "Search appearance",
    icon: "share",
    resultLabel: "A social card preview and copy-ready Open Graph tags",
    features: [
      "Live social-card preview",
      "Open Graph and X card tag generation",
      "Image, title, and description checks",
    ],
    guide: [
      {
        title: "Treat the social card as launch creative",
        body: "A shared link is often the first contact someone has with a product. Use one clear visual, a title that identifies the product, and a description that communicates the audience and benefit without relying on surrounding post copy.",
      },
      {
        title: "Keep the page and card consistent",
        body: "The promise in the social card should be easy to confirm on the destination page. Consistent naming, colors, and positioning reduce confusion when launch traffic moves from a social post to the product page.",
      },
    ],
    faqs: [
      {
        question: "Why does an old image still appear after I update my tags?",
        answer:
          "Social platforms cache link previews. After publishing the new tags, use the platform's sharing debugger or card validator to request a fresh scrape.",
      },
      {
        question: "Do Open Graph tags replace normal SEO metadata?",
        answer:
          "No. Open Graph tags control many social previews, while the title tag and meta description primarily describe the page to search engines. A launch page usually needs both.",
      },
      {
        question: "Should every page use the same social image?",
        answer:
          "A consistent fallback is useful, but important launch, feature, and comparison pages perform better when the image reflects the specific page being shared.",
      },
    ],
    relatedTools: [
      "serp-preview-meta-tag-generator",
      "product-screenshot-alt-text-generator",
      "product-description-seo-grader",
    ],
  },
  {
    slug: "startup-keyword-generator",
    name: "Startup Keyword Generator",
    shortName: "Keyword Generator",
    description:
      "Turn your product, audience, and use case into practical branded, category, problem, and long-tail keyword ideas for launch content.",
    metaDescription:
      "Generate startup SEO keyword ideas from your product, audience, and use case with Shipyard's free founder-focused keyword generator.",
    category: "Keyword research",
    icon: "keywords",
    resultLabel: "Organized keyword clusters for product and launch pages",
    features: [
      "Founder-focused keyword prompts",
      "Branded, problem, category, and comparison clusters",
      "Copyable groups for content planning",
    ],
    guide: [
      {
        title: "Start with the language customers already use",
        body: "Describe the task, pain point, or desired outcome in plain language before introducing your product category. Early-stage products often discover useful search terms by combining a specific audience with a specific job to be done.",
      },
      {
        title: "Match each keyword to a useful page",
        body: "A keyword list is only valuable when it maps to content that satisfies the query. Use category terms on the main product page, comparison terms on honest alternative pages, and question terms in guides or FAQs.",
      },
    ],
    faqs: [
      {
        question: "Does this tool provide search volume?",
        answer:
          "No. It generates structured ideas from your product inputs. Validate the most promising terms with Search Console, an ads keyword planner, customer interviews, or a dedicated keyword database.",
      },
      {
        question: "Should a new startup target broad keywords?",
        answer:
          "Usually not first. Specific audience, problem, and use-case phrases tend to be easier to address well and are more likely to match an early product's positioning.",
      },
      {
        question: "How many keywords should one page target?",
        answer:
          "Build each page around one clear search intent. Closely related phrases can appear naturally, but unrelated intents deserve separate pages.",
      },
    ],
    relatedTools: [
      "product-description-seo-grader",
      "serp-preview-meta-tag-generator",
      "startup-faq-schema-generator",
    ],
  },
  {
    slug: "product-description-seo-grader",
    name: "Product Description SEO Grader",
    shortName: "Description Grader",
    description:
      "Check whether your product description clearly explains the audience, problem, outcome, keywords, and proof a visitor needs before launch.",
    metaDescription:
      "Grade a startup product description for SEO clarity, search intent, readability, and launch readiness with Shipyard's free tool.",
    category: "On-page SEO",
    icon: "description",
    resultLabel: "An actionable description score with specific fixes",
    features: [
      "Clarity and search-intent checks",
      "Audience, benefit, and proof coverage",
      "Prioritized recommendations instead of filler scores",
    ],
    guide: [
      {
        title: "Clarity comes before keyword density",
        body: "A strong product description quickly names the audience, the problem, and the outcome. Search terms are useful when they clarify those ideas; repeating them without adding meaning makes the page harder for people to trust.",
      },
      {
        title: "Support the promise with specifics",
        body: "Mention the workflow, integration, constraint, or proof that makes the benefit believable. Concrete details also give search engines more context than broad claims such as fast, powerful, or all-in-one.",
      },
    ],
    faqs: [
      {
        question: "Is a high score a guarantee that the page will rank?",
        answer:
          "No. The score is an editing aid, not a ranking prediction. Search performance also depends on intent match, technical accessibility, competition, reputation, and useful supporting content.",
      },
      {
        question: "Can I grade my Shipyard launch description?",
        answer:
          "Yes. Use it to improve clarity and positioning, then adapt the result to the length and format of the launch form rather than copying an entire landing page.",
      },
      {
        question: "Should I put the product name in every sentence?",
        answer:
          "No. Name the product where it helps comprehension, then use natural pronouns and category language. Repetition is not a substitute for useful detail.",
      },
    ],
    relatedTools: [
      "startup-keyword-generator",
      "serp-preview-meta-tag-generator",
      "startup-faq-schema-generator",
    ],
  },
  {
    slug: "seo-url-slug-generator",
    name: "SEO URL Slug Generator",
    shortName: "URL Slug Generator",
    description:
      "Turn a product, feature, article, or comparison title into a short, readable URL slug with full control over cleanup rules.",
    metaDescription:
      "Create short, readable SEO URL slugs for product, feature, launch, and comparison pages with Shipyard's free slug generator.",
    category: "On-page SEO",
    icon: "link",
    resultLabel: "A clean URL slug ready to copy into your CMS",
    features: [
      "Safe lowercase and separator cleanup",
      "Optional stop-word and date removal",
      "Live URL preview before copying",
    ],
    guide: [
      {
        title: "Make the destination obvious",
        body: "A useful slug tells a visitor what the page contains before they open it. Keep the meaningful words, remove formatting noise, and avoid internal labels that only your team understands.",
      },
      {
        title: "Choose a URL you can keep",
        body: "Changing a published URL creates redirect and sharing work. Avoid dates, version numbers, or temporary campaign language unless they are essential to the content and will remain accurate.",
      },
    ],
    faqs: [
      {
        question: "Do short URLs automatically rank better?",
        answer:
          "No. Shortness alone is not a ranking guarantee, but a concise and descriptive URL is easier to read, share, and maintain.",
      },
      {
        question: "Should I remove every stop word?",
        answer:
          "Only when the result remains clear. Words such as for, to, or with can be important when they distinguish the page's meaning or audience.",
      },
      {
        question: "What separator should I use?",
        answer:
          "Hyphens are the common choice for readable web slugs. Use the same convention consistently across the site.",
      },
    ],
    relatedTools: [
      "serp-preview-meta-tag-generator",
      "xml-sitemap-generator",
      "product-description-seo-grader",
    ],
  },
  {
    slug: "product-screenshot-alt-text-generator",
    name: "Product Screenshot Alt-Text Generator",
    shortName: "Screenshot Alt Text",
    description:
      "Create concise alt text for product screenshots by describing the interface, visible action, and purpose without keyword stuffing.",
    metaDescription:
      "Write useful alt text for SaaS, app, and product screenshots with Shipyard's free accessibility and SEO-focused generator.",
    category: "On-page SEO",
    icon: "image",
    resultLabel: "Concise, context-aware alt text for a product screenshot",
    features: [
      "Prompts for interface, action, and context",
      "Decorative-image guidance",
      "Length and repetition checks",
    ],
    guide: [
      {
        title: "Describe the purpose, not every pixel",
        body: "Useful alt text explains the information or action the screenshot contributes in its surrounding context. Focus on the product area and outcome a visitor needs to understand instead of listing colors, borders, and decorative details.",
      },
      {
        title: "Know when an empty alt attribute is correct",
        body: "If nearby text already communicates everything the image adds, the screenshot may be decorative and should use an empty alt attribute. Do not repeat a caption word for word just to fill the field.",
      },
    ],
    faqs: [
      {
        question: "Does every product screenshot need alt text?",
        answer:
          "Every image needs an alt attribute, but the value can be empty when the image is purely decorative or duplicates adjacent text. Informative screenshots need a meaningful description.",
      },
      {
        question: "Should alt text include the words image or screenshot?",
        answer:
          "Usually not. Assistive technology already announces an image. Mention that it is a screenshot only when the format itself is relevant to understanding the content.",
      },
      {
        question: "Can I add SEO keywords to alt text?",
        answer:
          "Use relevant product or feature terms when they accurately describe the image. Do not add unrelated phrases or repeat keywords for ranking purposes.",
      },
    ],
    relatedTools: [
      "open-graph-social-preview-generator",
      "product-description-seo-grader",
      "serp-preview-meta-tag-generator",
    ],
  },
  {
    slug: "startup-faq-schema-generator",
    name: "Startup FAQ & Schema Generator",
    shortName: "FAQ Schema Generator",
    description:
      "Draft useful product FAQs and generate matching FAQPage JSON-LD for the questions and answers that are visibly published on your page.",
    metaDescription:
      "Create startup product FAQs and valid FAQPage JSON-LD markup with Shipyard's free founder-focused schema generator.",
    category: "Structured data",
    icon: "faq",
    resultLabel: "Visible FAQ copy and matching JSON-LD markup",
    features: [
      "Founder-focused question prompts",
      "Editable FAQ pairs",
      "Validated FAQPage JSON-LD output",
    ],
    guide: [
      {
        title: "Answer real buying and onboarding questions",
        body: "Prioritize questions prospects actually ask about fit, pricing, setup, data, limitations, and support. An FAQ is most useful when it removes uncertainty rather than restating the marketing headline.",
      },
      {
        title: "Keep structured data aligned with the page",
        body: "The questions and answers in FAQ markup should also be visible to visitors on the same page. Structured data describes published content; it should not hide extra claims from users or promise a particular search treatment.",
      },
    ],
    faqs: [
      {
        question: "Will FAQ schema guarantee a rich result?",
        answer:
          "No. Valid structured data makes content machine-readable, but search engines decide whether and how to display enhanced results.",
      },
      {
        question: "Can I mark up user-submitted answers as FAQPage?",
        answer:
          "FAQPage is intended for pages where the site provides the answers. Community question-and-answer content may require a different schema type and moderation approach.",
      },
      {
        question: "Where should I place the generated JSON-LD?",
        answer:
          "Add it to the HTML of the page containing the visible FAQs, commonly in the head or body through your framework's structured-data support.",
      },
    ],
    relatedTools: [
      "software-application-schema-generator",
      "product-description-seo-grader",
      "startup-keyword-generator",
    ],
  },
  {
    slug: "software-application-schema-generator",
    name: "SoftwareApplication Schema Generator",
    shortName: "App Schema Generator",
    description:
      "Generate JSON-LD for a SaaS product, web app, mobile app, API, browser extension, or desktop product without hand-writing schema.",
    metaDescription:
      "Generate SoftwareApplication JSON-LD for SaaS, web, mobile, API, and desktop products with Shipyard's free schema tool.",
    category: "Structured data",
    icon: "schema",
    resultLabel: "Formatted SoftwareApplication JSON-LD markup",
    features: [
      "Inputs tailored to software products",
      "Optional offer and product image fields",
      "Formatted, copy-ready JSON-LD",
    ],
    guide: [
      {
        title: "Describe the software that is actually available",
        body: "Use the public product name, application category, operating system or platform, and a truthful offer. Only include ratings or pricing details that are visible and supported on the page.",
      },
      {
        title: "Structured data supports, rather than replaces, the page",
        body: "The markup should agree with the title, description, pricing, and product information a visitor can see. It can help machines interpret the page, but it does not replace crawlable content or guarantee enhanced search features.",
      },
    ],
    faqs: [
      {
        question: "Can a SaaS product use SoftwareApplication schema?",
        answer:
          "Yes. A web-based software product can use SoftwareApplication, typically with an appropriate application category and browser or web platform details.",
      },
      {
        question: "Do I need to include a rating?",
        answer:
          "No. Omit aggregate ratings unless the page visibly shows genuine rating data that your site is permitted to publish.",
      },
      {
        question: "How do I test the generated markup?",
        answer:
          "Validate the JSON syntax first, then use a structured-data testing tool and monitor the published URL in your search console for detected issues.",
      },
    ],
    relatedTools: [
      "startup-faq-schema-generator",
      "serp-preview-meta-tag-generator",
      "xml-sitemap-generator",
    ],
  },
  {
    slug: "robots-txt-ai-crawler-generator",
    name: "Robots.txt & AI Crawler Generator",
    shortName: "Robots.txt Generator",
    description:
      "Build a readable robots.txt policy for search and AI crawlers, exclude sensitive paths from compliant crawlers, and add your sitemap.",
    metaDescription:
      "Create robots.txt rules for search engines and AI crawlers, private paths, and sitemaps with Shipyard's free generator.",
    category: "Technical SEO",
    icon: "bot",
    resultLabel: "A robots.txt file ready to review and publish",
    features: [
      "Search and named AI crawler controls",
      "Allow and disallow path rules",
      "Sitemap directive and access summary",
    ],
    guide: [
      {
        title: "Robots.txt controls crawling, not access",
        body: "A disallow rule asks compliant crawlers not to fetch a path. It does not make the path private. Protect dashboards, customer data, staging sites, and internal files with authentication and authorization.",
      },
      {
        title: "Review broad rules before publishing",
        body: "A single slash or wildcard can unintentionally block an entire site or important assets. Test the final policy against the public pages, JavaScript, images, and API paths your product page needs to render and be discovered.",
      },
    ],
    faqs: [
      {
        question: "Where does robots.txt go?",
        answer:
          "Publish it at the root of the hostname it controls, such as https://example.com/robots.txt. Rules on one subdomain do not automatically control another.",
      },
      {
        question: "Does disallow remove a page from search results?",
        answer:
          "Not necessarily. A blocked URL can still be known from links. Use appropriate noindex controls on crawlable pages or restrict access when removal or privacy is required.",
      },
      {
        question: "Do all AI services use the same crawler name?",
        answer:
          "No. Services publish their own user-agent names and policies, which can change. Verify the current documentation for each service before relying on a rule.",
      },
    ],
    relatedTools: [
      "xml-sitemap-generator",
      "software-application-schema-generator",
      "serp-preview-meta-tag-generator",
    ],
  },
  {
    slug: "xml-sitemap-generator",
    name: "XML Sitemap Generator",
    shortName: "XML Sitemap Generator",
    description:
      "Turn a list of product, feature, comparison, and content URLs into a valid XML sitemap you can review and download.",
    metaDescription:
      "Create a valid XML sitemap from your startup or product URLs with Shipyard's free browser-based sitemap generator.",
    category: "Technical SEO",
    icon: "sitemap",
    resultLabel: "A valid XML sitemap ready to download",
    features: [
      "Bulk URL cleanup and duplicate removal",
      "Optional last-modified dates",
      "XML validation before download",
    ],
    guide: [
      {
        title: "Include canonical, indexable URLs",
        body: "A sitemap should list the preferred public versions of pages you want search engines to discover. Remove redirects, error pages, parameter duplicates, private routes, and URLs intentionally marked noindex.",
      },
      {
        title: "Treat the sitemap as a discovery aid",
        body: "Submitting a sitemap helps crawlers find URLs, especially on a new site, but it does not guarantee indexing. Pages still need useful content, working internal links, and technically accessible responses.",
      },
    ],
    faqs: [
      {
        question: "Does a small startup site need a sitemap?",
        answer:
          "A well-linked small site can be crawled without one, but a sitemap is still a low-cost way to declare canonical URLs and monitor their discovery in search tools.",
      },
      {
        question: "Should I add every URL on the site?",
        answer:
          "No. Include canonical URLs you want indexed. Leave out account pages, internal search results, duplicate parameters, redirects, errors, and noindex pages.",
      },
      {
        question: "Where should I submit the sitemap?",
        answer:
          "Publish it on your site, reference it from robots.txt, and submit its URL through the search engine webmaster tools you use.",
      },
    ],
    relatedTools: [
      "robots-txt-ai-crawler-generator",
      "seo-url-slug-generator",
      "software-application-schema-generator",
    ],
  },
]

export const FREE_SEO_TOOL_BY_SLUG = Object.fromEntries(
  FREE_SEO_TOOLS.map((tool) => [tool.slug, tool]),
) as Record<FreeToolSlug, FreeToolDefinition>

export function isFreeToolSlug(value: string): value is FreeToolSlug {
  return (FREE_TOOL_SLUGS as readonly string[]).includes(value)
}

export function getFreeTool(slug: string) {
  return isFreeToolSlug(slug) ? FREE_SEO_TOOL_BY_SLUG[slug] : undefined
}

export function getRelatedFreeTools(
  tool: FreeToolDefinition,
  limit = 3,
): FreeToolDefinition[] {
  const requested = tool.relatedTools
    .map((slug) => FREE_SEO_TOOL_BY_SLUG[slug])
    .filter(Boolean)

  if (requested.length >= limit) return requested.slice(0, limit)

  const selected = new Set([tool.slug, ...requested.map((item) => item.slug)])
  const fallback = FREE_SEO_TOOLS.filter((item) => !selected.has(item.slug))

  return [...requested, ...fallback].slice(0, limit)
}
