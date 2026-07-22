import {
  FREE_TOOL_SLUGS,
  type FreeToolDefinition,
  type FreeToolSlug,
} from "@/lib/tools/types"
import { TOOLS_PATH, toolPath } from "@/lib/routes"

export const FREE_TOOLS_PATH = TOOLS_PATH

export const FREE_TOOLS_PAGE_TITLE = "23 Free SEO Tools for Startups"
export const FREE_TOOLS_PAGE_DESCRIPTION =
  "Audit pages, check Core Web Vitals, compare competitors, analyze content, and generate metadata, schema, redirects, sitemaps, robots rules, and UTM URLs."

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
    seoTitle: "Open Graph Generator",
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
    seoTitle: "Screenshot Alt Text Generator",
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
      "Create startup product FAQs and valid FAQPage JSON-LD markup with Shipyard's free founder-focused schema generator and live preview.",
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
    seoTitle: "Software Schema Generator",
    shortName: "App Schema Generator",
    description:
      "Generate JSON-LD for a SaaS product, web app, mobile app, API, browser extension, or desktop product without hand-writing schema.",
    metaDescription:
      "Generate SoftwareApplication JSON-LD for SaaS, web, mobile, API, and desktop products with Shipyard's free validated schema tool.",
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
      "Create robots.txt rules for search engines and AI crawlers, private paths, and sitemaps with Shipyard's free online generator.",
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
      "Create a valid XML sitemap from your startup or product URLs with Shipyard's free browser-based generator and download it instantly.",
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
  {
    slug: "seo-audit",
    name: "Free SEO Audit",
    shortName: "SEO Audit",
    description:
      "Scan a public page for search, content, social, accessibility, and technical issues, then work through a prioritized report.",
    metaDescription:
      "Run a free SEO audit covering metadata, headings, links, images, schema, crawl controls, social tags, and page experience.",
    category: "SEO auditing",
    icon: "audit",
    resultLabel: "A prioritized page score with evidence for every check",
    features: [
      "30 transparent, evidence-based checks",
      "Critical fixes separated from improvements",
      "Markdown report export",
    ],
    guide: [
      {
        title: "Fix blockers before polish",
        body: "Start with crawlability, status, canonical, title, description, and the main heading. These determine whether search engines can access and understand the page before smaller optimizations matter.",
      },
      {
        title: "Treat the score as a review queue",
        body: "A score is useful for prioritization, not as a ranking promise. Read the evidence, confirm it against the rendered page, and only apply recommendations that fit the page's intent.",
      },
    ],
    faqs: [
      {
        question: "Does the audit change my website?",
        answer:
          "No. It reads the public HTML and response details and does not write to the scanned site.",
      },
      {
        question: "Can a high score guarantee rankings?",
        answer:
          "No. The report covers controllable page signals, while rankings also depend on usefulness, competition, reputation, and search intent.",
      },
      {
        question: "Why might a JavaScript page look incomplete?",
        answer:
          "The audit reads the initial server response. Metadata and important content should be present there for reliable crawling and sharing.",
      },
    ],
    relatedTools: [
      "bulk-seo-audit",
      "seo-comparison",
      "core-web-vitals-checker",
    ],
  },
  {
    slug: "bulk-seo-audit",
    name: "Bulk SEO Audit",
    shortName: "Bulk Audit",
    description:
      "Audit up to ten public URLs in one run and spot pages with missing metadata, weak structure, or crawl problems.",
    metaDescription:
      "Audit up to ten URLs for free and compare page scores, metadata, headings, images, links, schema, and crawlability in one report.",
    category: "SEO auditing",
    icon: "audit",
    resultLabel: "A sortable page-by-page audit summary and full findings",
    features: [
      "Up to 10 URLs per run",
      "Parallel page analysis",
      "Per-page exportable findings",
    ],
    guide: [
      {
        title: "Audit a representative set",
        body: "Include the homepage plus one product, category, article, and conversion page. Different templates often fail in different ways.",
      },
      {
        title: "Look for repeated failures",
        body: "The most valuable bulk finding is usually a problem shared by a template. Fixing it once can improve many pages at the same time.",
      },
    ],
    faqs: [
      {
        question: "How many pages can I scan?",
        answer: "Each run accepts up to ten unique public HTTP or HTTPS URLs.",
      },
      {
        question: "Are scans stored?",
        answer:
          "The tool does not require an account and the interface does not save a scan history.",
      },
      {
        question: "Should every page have the same score?",
        answer:
          "No. Page purposes differ. Use the individual evidence instead of forcing every template into identical markup.",
      },
    ],
    relatedTools: ["seo-audit", "seo-comparison", "seo-audit-checklist"],
  },
  {
    slug: "seo-comparison",
    name: "SEO Page Comparison",
    shortName: "Page Comparison",
    description:
      "Compare up to five pages side by side across metadata, content structure, links, images, schema, and technical signals.",
    metaDescription:
      "Compare the on-page and technical SEO signals of up to five public URLs side by side with Shipyard's free comparison tool.",
    category: "SEO auditing",
    icon: "compare",
    resultLabel: "A side-by-side evidence table that reveals meaningful gaps",
    features: [
      "Five-page comparison",
      "Consistent metrics across every URL",
      "No ranking claims or hidden weighting",
    ],
    guide: [
      {
        title: "Compare like with like",
        body: "Compare pages serving the same search intent. A pricing page and a tutorial need different structures, so their raw counts are not useful benchmarks for one another.",
      },
      {
        title: "Learn from differences, not just winners",
        body: "Use competitors to find topics, clarity, or technical gaps. Do not copy wording or inflate counts merely because another page has more of something.",
      },
    ],
    faqs: [
      {
        question: "Does this show keyword rankings?",
        answer:
          "No. It compares public page signals and content structure, not live search positions or backlink indexes.",
      },
      {
        question: "Can I compare competitors?",
        answer:
          "Yes, if the pages are publicly accessible and you use the findings as research rather than copying their content.",
      },
      {
        question: "Which score should I trust?",
        answer:
          "Use scores as a quick index, then review the actual evidence and whether it fits the query the page should answer.",
      },
    ],
    relatedTools: ["seo-audit", "bulk-seo-audit", "keyword-density-checker"],
  },
  {
    slug: "schema-markup-generator",
    name: "Schema Markup Generator",
    shortName: "Schema Generator",
    description:
      "Generate valid JSON-LD for organizations, articles, products, local businesses, events, breadcrumbs, jobs, how-tos, and FAQs.",
    metaDescription:
      "Generate copy-ready JSON-LD for nine common Schema.org types with Shipyard's free structured data generator and live validation.",
    category: "Structured data",
    icon: "schema",
    resultLabel: "Validated, copy-ready JSON-LD for the selected content type",
    features: [
      "Nine schema templates",
      "Only complete fields are emitted",
      "Live JSON validation",
    ],
    guide: [
      {
        title: "Choose the most specific truthful type",
        body: "Use a type that matches the main visible content. Structured data should describe the page visitors receive, not a more attractive category.",
      },
      {
        title: "Validate after publishing",
        body: "Valid JSON is only the first step. Test the deployed page and confirm the values still match its visible name, offer, dates, address, or instructions.",
      },
    ],
    faqs: [
      {
        question: "Does schema guarantee a rich result?",
        answer:
          "No. It helps machines interpret a page, but search engines choose whether an enhanced result is appropriate.",
      },
      {
        question: "Where should JSON-LD be placed?",
        answer:
          "Include the script in the page head or body using your site's supported structured-data mechanism.",
      },
      {
        question: "Can I include fields visitors cannot see?",
        answer:
          "Avoid it. Important claims in structured data should be supported by visible, accurate page content.",
      },
    ],
    relatedTools: [
      "software-application-schema-generator",
      "startup-faq-schema-generator",
      "seo-audit",
    ],
  },
  {
    slug: "core-web-vitals-checker",
    name: "Core Web Vitals Checker",
    shortName: "Web Vitals Checker",
    description:
      "Check mobile or desktop performance with field data when available and Lighthouse lab diagnostics from Google's PageSpeed service.",
    metaDescription:
      "Check LCP, INP, CLS, performance, accessibility, best practices, and SEO for a public URL with a free PageSpeed-powered report.",
    category: "Technical SEO",
    icon: "speed",
    resultLabel: "Field and lab performance metrics with clear thresholds",
    features: [
      "Mobile and desktop strategies",
      "Field data clearly separated from lab data",
      "Actionable Lighthouse opportunities",
    ],
    guide: [
      {
        title: "Know which data you are reading",
        body: "Field data reflects real visitors over time when enough data exists. Lighthouse lab data is a controlled diagnostic run. Both are useful, but they answer different questions.",
      },
      {
        title: "Optimize the slowest user path",
        body: "Prioritize the largest element, long main-thread tasks, layout shifts, and render-blocking requests. Re-test after deploying rather than optimizing from one isolated run.",
      },
    ],
    faqs: [
      {
        question: "Why is field data unavailable?",
        answer:
          "New or low-traffic URLs may not have enough Chrome user data. The tool still shows a lab report when the service returns one.",
      },
      {
        question: "Why do scores change?",
        answer:
          "Networks, servers, third parties, test location, and page state vary. Compare several runs and real-user data before drawing conclusions.",
      },
      {
        question: "Is PageSpeed data free here?",
        answer:
          "Yes. Shipyard does not charge for this tool; upstream public-service quotas can still temporarily limit requests.",
      },
    ],
    relatedTools: ["seo-audit", "bulk-seo-audit", "seo-audit-checklist"],
  },
  {
    slug: "meta-tag-generator",
    name: "Meta Tag Generator",
    shortName: "Meta Tag Generator",
    description:
      "Build title, description, canonical, robots, viewport, charset, author, and language tags without hand-writing HTML.",
    metaDescription:
      "Generate complete, escaped HTML meta tags for title, description, canonical, robots, viewport, language, and author safely online.",
    category: "Search appearance",
    icon: "search",
    resultLabel: "Clean HTML metadata with live length and indexability checks",
    features: [
      "Complete essential metadata",
      "Robots controls with warnings",
      "Safe HTML escaping",
    ],
    guide: [
      {
        title: "Keep the essentials page-specific",
        body: "The title, description, and canonical should describe this page rather than repeat the same site-wide defaults.",
      },
      {
        title: "Use robots controls deliberately",
        body: "A noindex instruction removes an eligible page from search. Do not use it as a substitute for authentication or access control.",
      },
    ],
    faqs: [
      {
        question: "Which tags are essential?",
        answer:
          "A descriptive title, useful description, canonical URL, charset, and viewport are a strong baseline for public pages.",
      },
      {
        question: "Is meta keywords included?",
        answer:
          "No. Major search engines do not use the old meta keywords field for ranking, so the tool avoids encouraging it.",
      },
      {
        question: "Can Google rewrite my metadata?",
        answer:
          "Yes. Search engines may produce a title or snippet that better matches a query, but accurate metadata remains valuable input.",
      },
    ],
    relatedTools: [
      "serp-preview-meta-tag-generator",
      "open-graph-social-preview-generator",
      "seo-audit",
    ],
  },
  {
    slug: "hreflang-generator",
    name: "Hreflang Tag Generator",
    shortName: "Hreflang Generator",
    description:
      "Build reciprocal language and region annotations as HTML tags, HTTP Link headers, or XML sitemap entries.",
    metaDescription:
      "Generate hreflang annotations for multilingual pages in HTML, HTTP header, and XML sitemap formats with Shipyard's free tool.",
    category: "Technical SEO",
    icon: "globe",
    resultLabel:
      "Normalized hreflang annotations in three implementation formats",
    features: [
      "Language and optional region validation",
      "x-default support",
      "HTML, header, and sitemap output",
    ],
    guide: [
      {
        title: "Every alternate must return the reference",
        body: "Hreflang relationships are reciprocal. Each localized page should include itself and the other members of the same language cluster.",
      },
      {
        title: "Separate language from country",
        body: "Use an ISO language code first and add a region only when the content truly targets that locale. Do not use country codes alone.",
      },
    ],
    faqs: [
      {
        question: "Do I need x-default?",
        answer:
          "It is optional but useful for a language selector or global fallback that is not aimed at one locale.",
      },
      {
        question: "Can I use relative URLs?",
        answer:
          "Use absolute canonical URLs so crawlers can resolve every alternate consistently.",
      },
      {
        question: "Should I use all three formats?",
        answer:
          "No. Choose one implementation method and keep it accurate; duplicating formats adds maintenance risk.",
      },
    ],
    relatedTools: ["xml-sitemap-generator", "seo-audit", "meta-tag-generator"],
  },
  {
    slug: "keyword-density-checker",
    name: "Keyword Density Checker",
    shortName: "Keyword Density",
    description:
      "Analyze pasted copy for repeated words and phrases, density, readability, and possible overuse without pretending there is a perfect percentage.",
    metaDescription:
      "Analyze word and phrase frequency, keyword density, readability, and repetition in your content with a free browser-based tool.",
    category: "Content analysis",
    icon: "keywords",
    resultLabel:
      "Word and phrase frequency with context-aware repetition flags",
    features: [
      "One-, two-, and three-word phrases",
      "Optional stop-word filtering",
      "Runs entirely in your browser",
    ],
    guide: [
      {
        title: "Density is a diagnostic, not a target",
        body: "Use frequency to catch accidental repetition and missing terminology. There is no universal percentage that makes a page rank.",
      },
      {
        title: "Check phrases in context",
        body: "A repeated product name may be natural, while a repeated modifier can make copy awkward. Read every flagged phrase in its sentence before editing.",
      },
    ],
    faqs: [
      {
        question: "What is the ideal keyword density?",
        answer:
          "There is no reliable universal target. Cover the topic naturally and use this report to find obvious repetition.",
      },
      {
        question: "Does Shipyard upload my text?",
        answer:
          "No. The analysis runs in your browser and does not need an account.",
      },
      {
        question: "What are stop words?",
        answer:
          "They are very common words such as the, and, or to that can be hidden to make topic terms easier to inspect.",
      },
    ],
    relatedTools: [
      "word-counter",
      "product-description-seo-grader",
      "startup-keyword-generator",
    ],
  },
  {
    slug: "redirect-generator",
    name: "Redirect Rule Generator",
    shortName: "Redirect Generator",
    description:
      "Turn old and new URL pairs into 301 or 302 rules for Apache, Nginx, Next.js, and Vercel.",
    metaDescription:
      "Generate validated bulk redirect rules for Apache, Nginx, Next.js, and Vercel from old and new URL pairs with Shipyard's free tool.",
    category: "Technical SEO",
    icon: "redirect",
    resultLabel: "Copy-ready redirect configuration for four platforms",
    features: [
      "Bulk source and destination pairs",
      "301 and 302 output",
      "Loop and duplicate warnings",
    ],
    guide: [
      {
        title: "Redirect to the closest replacement",
        body: "Send an old URL to the page that best satisfies the same intent. Redirecting everything to the homepage is confusing and can be treated like a soft error.",
      },
      {
        title: "Avoid chains",
        body: "Point every legacy URL directly to the final live destination. Chains add latency and are harder to maintain.",
      },
    ],
    faqs: [
      {
        question: "When should I use 301?",
        answer:
          "Use a permanent redirect when the old URL has been replaced for good. Use 302 only for a genuinely temporary move.",
      },
      {
        question: "Does this edit my server?",
        answer:
          "No. Review and add the generated configuration through your deployment workflow.",
      },
      {
        question: "Can paths contain query strings?",
        answer:
          "They can, but platform matching rules differ. Test parameter-sensitive redirects in a staging environment.",
      },
    ],
    relatedTools: [
      "seo-url-slug-generator",
      "xml-sitemap-generator",
      "seo-audit",
    ],
  },
  {
    slug: "disavow-file-generator",
    name: "Google Disavow File Generator",
    shortName: "Disavow Generator",
    description:
      "Build and validate a plain-text disavow file while keeping Google's high-risk, advanced-use warning impossible to miss.",
    metaDescription:
      "Create and validate a Google disavow text file from URLs and domains, with duplicate cleanup and prominent safety guidance.",
    category: "Technical SEO",
    icon: "shield",
    resultLabel:
      "A deduplicated disavow file with high-risk entries called out",
    features: [
      "URL and domain normalization",
      "Duplicate and invalid-entry detection",
      "Prominent misuse warning",
    ],
    guide: [
      {
        title: "Most sites should not use this",
        body: "Disavowing legitimate links can harm search performance. Use it only when you understand the link history and cannot get artificial or harmful links removed directly.",
      },
      {
        title: "Review domains and URLs separately",
        body: "A domain directive affects every link from that hostname. Prefer the narrowest evidence-supported scope and retain your source notes.",
      },
    ],
    faqs: [
      {
        question: "Will this remove links?",
        answer:
          "No. It only formats a file that can ask Google to ignore specified links during ranking evaluation.",
      },
      {
        question: "Should I upload every low-quality link?",
        answer:
          "No. Google advises caution; ordinary spammy-looking links generally do not justify broad disavowal.",
      },
      {
        question: "Does Shipyard submit the file?",
        answer:
          "No. The tool only generates it. Submission is a separate manual action in Google's service.",
      },
    ],
    relatedTools: ["seo-audit", "seo-audit-checklist", "redirect-generator"],
  },
  {
    slug: "word-counter",
    name: "Word Counter & Reading Time",
    shortName: "Word Counter",
    description:
      "Measure words, characters, sentences, paragraphs, reading time, speaking time, average word length, and frequent terms as you type.",
    metaDescription:
      "Count words, characters, sentences, paragraphs, reading time, speaking time, and frequent terms instantly in your browser.",
    category: "Content analysis",
    icon: "counter",
    resultLabel: "A live content summary with no upload or account required",
    features: [
      "Live text metrics",
      "Reading and speaking estimates",
      "Frequent-word breakdown",
    ],
    guide: [
      {
        title: "Use length to fit the job",
        body: "A concise product section and an in-depth guide have different needs. Measure whether the copy fully answers its intent instead of chasing a generic word count.",
      },
      {
        title: "Read aloud before publishing",
        body: "Speaking time and sentence counts can reveal dense passages. Shorten sentences and add structure where the reader may lose the thread.",
      },
    ],
    faqs: [
      {
        question: "How is reading time calculated?",
        answer:
          "The estimate uses 200 words per minute. Real speed varies by reader and content complexity.",
      },
      {
        question: "Is my text sent to a server?",
        answer: "No. Counting and frequency analysis happen in your browser.",
      },
      {
        question: "Do headings count as words?",
        answer:
          "Yes. Paste the full visible content if you want a page-level estimate.",
      },
    ],
    relatedTools: [
      "keyword-density-checker",
      "product-description-seo-grader",
      "startup-keyword-generator",
    ],
  },
  {
    slug: "utm-builder",
    name: "Campaign URL & UTM Builder",
    shortName: "UTM Builder",
    description:
      "Build correctly encoded campaign URLs with source, medium, campaign, term, and content parameters, then copy a consistent naming summary.",
    metaDescription:
      "Build correctly encoded Google Analytics campaign URLs with UTM source, medium, campaign, term, and content parameters for free.",
    category: "Marketing utilities",
    icon: "campaign",
    resultLabel: "An encoded campaign URL plus a reusable naming summary",
    features: [
      "Correct URL and Unicode encoding",
      "Existing query parameter preservation",
      "Live validation and copy",
    ],
    guide: [
      {
        title: "Standardize names before launch",
        body: "Decide whether sources and media use lowercase, hyphens, or underscores. Consistency prevents one campaign from fragmenting into several analytics rows.",
      },
      {
        title: "Never put secrets in a URL",
        body: "Campaign parameters appear in browser history, logs, referrers, screenshots, and analytics. Use descriptive labels, not personal or confidential data.",
      },
    ],
    faqs: [
      {
        question: "Which fields are required?",
        answer:
          "The destination URL, source, medium, and campaign are the useful baseline. Term and content are optional differentiators.",
      },
      {
        question: "Will existing query parameters be removed?",
        answer:
          "No. Valid parameters are preserved and UTM values are added or updated.",
      },
      {
        question: "Does the tool shorten links?",
        answer:
          "No. It generates the transparent destination URL so you can inspect it and use your own trusted shortener if needed.",
      },
    ],
    relatedTools: [
      "serp-preview-meta-tag-generator",
      "open-graph-social-preview-generator",
      "seo-audit-checklist",
    ],
  },
  {
    slug: "seo-audit-checklist",
    name: "SEO Audit Checklist",
    shortName: "SEO Checklist",
    description:
      "Work through a practical 50-point on-page, technical, content, authority, and measurement review with local progress saving.",
    metaDescription:
      "Use a free 50-point SEO audit checklist with category progress, browser-only saving, reset, filtering, and Markdown export.",
    category: "SEO auditing",
    icon: "checklist",
    resultLabel: "A 50-point review with local progress and Markdown export",
    features: [
      "50 concrete checks in five categories",
      "Progress saved only in your browser",
      "Filter and Markdown export",
    ],
    guide: [
      {
        title: "Assign evidence to every check",
        body: "Mark an item complete only after verifying the deployed page, response, report, or analytics view. A checklist is useful when it records reality rather than intention.",
      },
      {
        title: "Repeat after meaningful changes",
        body: "Revisit the technical and measurement sections after migrations, redesigns, domain changes, or major template updates.",
      },
    ],
    faqs: [
      {
        question: "Where is progress saved?",
        answer:
          "Completed items are stored in local browser storage on this device, not in a Shipyard account.",
      },
      {
        question: "Does completing every item guarantee rankings?",
        answer:
          "No. The checklist establishes a strong operating baseline but cannot replace useful content, reputation, and intent fit.",
      },
      {
        question: "Can I export the checklist?",
        answer:
          "Yes. Download a Markdown snapshot with complete and remaining items for planning or review.",
      },
    ],
    relatedTools: ["seo-audit", "bulk-seo-audit", "core-web-vitals-checker"],
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
