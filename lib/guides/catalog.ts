export type GuideSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

export type GuideFaq = {
  question: string
  answer: string
}

export type GuideDefinition = {
  slug: string
  title: string
  metaDescription: string
  eyebrow: string
  lede: string
  directAnswer: string
  readingTime: string
  updatedAt: string
  sections: readonly GuideSection[]
  faqs: readonly GuideFaq[]
  relatedSlugs: readonly string[]
}

export const GUIDES = [
  {
    slug: "submit-product-to-directories",
    title: "How to Submit Your Product to Directories",
    metaDescription:
      "Submit your app, SaaS, or startup to product directories with this practical checklist for better listings, referral traffic, and launch discovery.",
    eyebrow: "Product directory submission guide",
    lede: "A product directory submission works best when it gives the right visitor enough detail to understand your app, trust the listing, and take the next step. Use this founder-friendly process to prepare one strong source pack, choose relevant directories, and measure which listings bring useful traffic.",
    directAnswer:
      "To submit a product to directories, prepare a clear one-line description, a detailed product summary, accurate category and pricing details, a logo, screenshots, your website URL, and maker information. Start with directories that match your audience, publish complete listings, and track visits and sign-ups instead of submitting the same thin copy everywhere.",
    readingTime: "9 min read",
    updatedAt: "2026-07-22",
    sections: [
      {
        id: "prepare",
        title: "Prepare one complete product submission pack",
        paragraphs: [
          "Before opening a dozen submission forms, create one accurate source document for your launch. This saves time, keeps your positioning consistent, and reduces the chance of publishing an outdated price, broken link, or vague description.",
          "Your short description should say what the product is, who it helps, and the main outcome in one or two sentences. Your longer description can explain the problem, key features, ideal use cases, pricing model, supported platforms, and what makes the product different. Write for a person comparing options, not for a search engine counting repeated keywords.",
        ],
        bullets: [
          "Product name, website URL, launch date, and founder or team name",
          "A specific tagline that identifies the category and audience",
          "A useful 150–400 word description written in complete sentences",
          "Square logo, clear screenshots, and descriptive image text",
          "Category, product type, pricing model, platforms, and use cases",
          "A tracked link or analytics note so you can measure each directory",
        ],
      },
      {
        id: "choose",
        title: "Choose relevant product directories, not the longest list",
        paragraphs: [
          "A smaller set of relevant directories can outperform hundreds of automatic submissions. Look for an audience that resembles your buyer, active listings in your category, pages that Google can access, clear moderation rules, and enough product detail to help someone make a decision.",
          "Use broad launch communities for an initial wave of attention, category directories for long-term discovery, local or industry directories for a precise audience, and software comparison sites when buyers are already evaluating alternatives. Shipyard combines a permanent product page with category, use-case, platform, pricing, and leaderboard discovery paths, so one complete listing can appear in several relevant contexts.",
        ],
        bullets: [
          "Broad launch platform: useful for launch-day feedback and community reach",
          "Curated product directory: useful for ongoing browsing and search discovery",
          "Niche directory: useful for high-intent visitors in one market or workflow",
          "Comparison site: useful when buyers search for alternatives and pricing",
          "Founder community: useful for feedback, relationships, and early advocates",
        ],
      },
      {
        id: "listing",
        title: "Build a listing that deserves the click",
        paragraphs: [
          "Do not paste only a slogan. A useful listing answers the questions a visitor would ask before opening another tab: What does this product do? Who is it for? What problem does it solve? Is it free or paid? Does it work on my platform? Who built it? Is the product active?",
          "Add screenshots that show the actual product, not only decorative graphics. Pick the narrowest accurate categories, and use a handful of meaningful tags rather than every popular term. If a directory lets you update the listing, return after launch to add new pricing, integrations, screenshots, and proof from real customers.",
        ],
        bullets: [
          "Lead with the product and outcome; avoid a mysterious teaser",
          "Use concrete features and workflows rather than broad claims",
          "Show the interface, output, or result in at least one screenshot",
          "Disclose pricing and platform limits when you know them",
          "Complete the maker profile so visitors know who stands behind the product",
        ],
      },
      {
        id: "links",
        title: "Understand directory links without chasing shortcuts",
        paragraphs: [
          "A directory link can send referral visitors, help people discover your brand, and give search engines another consistent reference for your product. People often call an ordinary link a do-follow link, although websites do not add a special “dofollow” label. Paid or sponsored links should be marked as sponsored, so buying a placement is not a safe way to buy search authority.",
          "For a new site, the useful goal is broader than a Domain Rating number. Build accurate citations, earn mentions from real communities, publish resources people want to reference, and turn directory visitors into users. Domain Rating is a third-party comparison metric, not a Google score, and no legitimate directory can guarantee that one listing will raise it.",
        ],
      },
      {
        id: "launch",
        title: "Submit in a focused launch sequence",
        paragraphs: [
          "Publish your own product page first so every directory points to a complete destination. Then submit to your best-fit directories over several days. This gives you time to answer comments, fix weak copy, and learn which audience responds before the next listing goes live.",
          "Treat Product Hunt as one possible launch channel, not the entire plan. A Product Hunt alternative or complementary directory can provide a different audience, a permanent category page, or a slower discovery window. Reuse the facts from your source pack, but rewrite the opening to match each community and never manufacture votes or reviews.",
        ],
        bullets: [
          "Day 1: publish and test your own landing page and analytics",
          "Day 2–3: submit to one primary launch platform and answer feedback",
          "Day 4–7: add relevant product, startup, and app directories",
          "Week 2: approach niche communities, newsletters, and resource pages",
          "Monthly: refresh accurate listings and record traffic or conversions",
        ],
      },
      {
        id: "measure",
        title: "Measure sign-ups and qualified visits, not submission count",
        paragraphs: [
          "Record the directory, listing URL, publication date, referral visits, engaged visits, registrations, and paid conversions. A directory that sends ten well-matched visitors can be more valuable than one that sends a thousand people who immediately leave.",
          "Use those results to improve the next submission. If people click but do not sign up, the listing may promise something the landing page does not explain. If a listing earns impressions but few clicks, improve the name, tagline, screenshot, or category fit. Keep the pages that create value and stop spending time on directories with no relevant audience.",
        ],
      },
    ],
    faqs: [
      {
        question: "Where can I submit my product or app?",
        answer:
          "Start with a launch platform, a curated product directory such as Shipyard, and two or three niche directories that match your product category or audience. Add more only when their visitors and listing quality are relevant.",
      },
      {
        question: "Should I use the same description on every directory?",
        answer:
          "Keep product facts consistent, but adapt the opening, examples, and category language to the directory's audience. Repeating a thin paragraph everywhere gives visitors little reason to trust or remember the listing.",
      },
      {
        question: "Do product directory links improve SEO?",
        answer:
          "They can support discovery, referral traffic, brand consistency, and natural mentions. A link does not guarantee rankings or a Domain Rating increase, and paid links should be marked as sponsored.",
      },
      {
        question: "Can I submit a product for free on Shipyard?",
        answer:
          "Yes. Shipyard offers a free public product listing with standard directory discovery. Optional paid plans add clearly labelled visibility and analytics features.",
      },
    ],
    relatedSlugs: [
      "product-launch-checklist",
      "startup-backlinks-domain-rating",
    ],
  },
  {
    slug: "product-launch-checklist",
    title: "Product Launch Checklist for Apps and Startups",
    metaDescription:
      "Plan an app, SaaS, or startup launch with a practical checklist for positioning, product directories, launch-day outreach, and post-launch growth.",
    eyebrow: "Founder launch playbook",
    lede: "A strong product launch is a short, coordinated learning cycle—not a single post. This checklist helps a non-technical founder prepare the message, landing page, product directory listings, outreach, measurement, and follow-up needed to turn launch attention into useful conversations and customers.",
    directAnswer:
      "Before launching, define the audience and promise, test the full sign-up path, prepare screenshots and answers, and choose a small set of relevant launch channels. On launch day, talk with users and fix friction quickly. After launch, follow up, publish what you learned, refresh directory listings, and keep the channels that produce engaged visitors or customers.",
    readingTime: "10 min read",
    updatedAt: "2026-07-22",
    sections: [
      {
        id: "positioning",
        title: "Start with one clear audience and outcome",
        paragraphs: [
          "Write down the person you want to reach, the job they are trying to complete, the problem with their current approach, and the result your product offers. If the sentence needs several “and” clauses, the launch is probably trying to speak to too many audiences at once.",
          "Turn that positioning into a plain headline, a one-sentence explanation, and three supporting points. These become the foundation for your homepage, directory descriptions, launch posts, email, and demo. Specific language makes it easier for people and search engines to understand where the product fits.",
        ],
        bullets: [
          "Audience: the role, team, or type of customer you serve",
          "Problem: the costly, slow, confusing, or risky current situation",
          "Outcome: what becomes easier or better after using the product",
          "Proof: a demo, example, result, customer quote, or transparent limitation",
        ],
      },
      {
        id: "destination",
        title: "Make the landing page ready for a real visitor",
        paragraphs: [
          "Your launch destination should explain the product before asking for a commitment. Show the interface or output, describe the main use cases, state pricing or the next step, and make the primary call to action easy to find on a phone. Test account creation, email verification, checkout, password reset, contact forms, and confirmation messages.",
          "Add basic trust signals: an identifiable company or maker, a working contact address, privacy and terms pages, accurate product screenshots, and honest claims. If the product is early, say what works today and what is still planned. Clear limits build more trust than inflated promises.",
        ],
        bullets: [
          "Headline and explanation match the launch post",
          "Primary call to action works without hidden steps",
          "Mobile layout, page speed, forms, and checkout are tested",
          "Pricing, free trial, waitlist, or demo process is clear",
          "Analytics records visits, sign-ups, and important actions",
        ],
      },
      {
        id: "assets",
        title: "Prepare the launch assets before the launch day",
        paragraphs: [
          "Create a small launch folder with your logo, screenshots, short demo, founder photo if appropriate, product facts, long and short descriptions, and answers to common questions. This keeps every submission accurate while giving you enough material to adapt the message for different communities.",
          "Screenshots should demonstrate a workflow or outcome. Captions can explain what the visitor is seeing and who benefits. Avoid making every image a promotional poster; someone comparing products needs evidence of how the product works.",
        ],
      },
      {
        id: "channels",
        title: "Choose a channel mix that can reach the right people",
        paragraphs: [
          "Use channels for different jobs. Your existing audience can provide early feedback. A launch community can create a concentrated conversation. Product directories can provide permanent discovery pages. Niche communities can reach a smaller but more relevant group. Partners and customers can add credible word of mouth.",
          "Product Hunt may fit the plan, but it does not need to carry the entire launch. A Product Hunt alternative such as Shipyard can give the product another launch surface, category discovery, and an ongoing listing. Follow each community's rules and contribute context instead of dropping the same link everywhere.",
        ],
        bullets: [
          "Owned: website, email list, product users, and founder social accounts",
          "Community: Product Hunt or alternatives, forums, and founder groups",
          "Directory: product, app, SaaS, AI, developer, or industry listings",
          "Earned: newsletters, podcasts, resource pages, and customer mentions",
          "Partner: integrations, agencies, investors, and complementary products",
        ],
      },
      {
        id: "launch-day",
        title: "Run launch day as a conversation",
        paragraphs: [
          "Be available to answer questions, thank people, collect examples of confusion, and fix obvious friction. Ask for specific feedback such as whether the use case is clear or where sign-up became difficult. Do not ask people to pretend they used the product, and do not buy votes or manufactured reviews.",
          "Keep a short incident list for broken links, slow pages, email failures, and unclear copy. Assign one owner for each problem, even if the whole team is one person. Fast, calm fixes protect the launch more than trying to make every public metric look perfect.",
        ],
      },
      {
        id: "after",
        title: "Use the two weeks after launch to build momentum",
        paragraphs: [
          "Follow up with interested visitors, publish answers to repeated questions, improve onboarding, and thank people who gave useful feedback. Refresh product directory listings with the best screenshot, clearer description, current pricing, and any credible proof learned during launch.",
          "Review traffic by source alongside registrations, activation, conversations, and revenue. Keep investing in channels that attract the intended audience. A launch with modest traffic and several retained users is more useful than a large spike with no engagement.",
        ],
        bullets: [
          "Within 24 hours: fix broken journeys and reply to high-intent questions",
          "Within 3 days: contact sign-ups who asked for help or a demo",
          "Within 1 week: improve onboarding and publish an FAQ or guide",
          "Within 2 weeks: compare channels by engaged visits and conversions",
          "Monthly: update permanent listings and share meaningful product progress",
        ],
      },
    ],
    faqs: [
      {
        question: "How long should I prepare for a product launch?",
        answer:
          "A small product can often prepare in two to four weeks if the core experience already works. Use the time to test the journey, prepare assets, recruit early users, and schedule a focused channel mix.",
      },
      {
        question: "Is Product Hunt required for a startup launch?",
        answer:
          "No. Product Hunt is one channel. You can combine customer outreach, product directories, niche communities, partners, content, and a Product Hunt alternative based on where your audience actually spends time.",
      },
      {
        question: "What should I measure on launch day?",
        answer:
          "Measure source visits, engaged visits, registrations, activation, conversations, and paid conversions. Votes and page views are useful context, but they do not replace evidence that relevant people understand and use the product.",
      },
      {
        question: "When should I submit to product directories?",
        answer:
          "Prepare listings before launch, then publish them in a focused sequence around launch week. Return after launch to improve the description, screenshots, pricing, and proof.",
      },
    ],
    relatedSlugs: [
      "submit-product-to-directories",
      "startup-backlinks-domain-rating",
    ],
  },
  {
    slug: "startup-backlinks-domain-rating",
    title: "Startup Backlinks and Domain Rating Guide",
    metaDescription:
      "Learn how startups can earn useful backlinks, understand do-follow links and Domain Rating, and build search authority without risky link shortcuts.",
    eyebrow: "Practical startup SEO",
    lede: "New sites need credible paths for people and search engines to discover them. This guide explains backlinks, ordinary or “do-follow” links, sponsored links, and Domain Rating in plain language—then gives founders a practical plan for earning useful mentions without buying risky promises.",
    directAnswer:
      "A startup improves its backlink profile by publishing something worth citing, getting listed on relevant directories, building partner and customer relationships, and earning editorial mentions. An ordinary link can pass ranking signals, while paid links should be marked as sponsored. Domain Rating can help compare link profiles, but it is not a Google score and no single listing can guarantee a boost.",
    readingTime: "9 min read",
    updatedAt: "2026-07-22",
    sections: [
      {
        id: "basics",
        title: "What a backlink does for a starting site",
        paragraphs: [
          "A backlink is a link from another website to yours. The immediate value is simple: a reader can follow it and discover your product. It can also help search engines find the site and understand how other pages describe it. Relevant, earned links are usually more useful than a large pile of unrelated directory entries.",
          "For an early startup, a good backlink often comes with context: the product name, category, audience, and reason it is useful. That context can send better referral traffic and reinforce a consistent brand description across the web.",
        ],
      },
      {
        id: "dofollow",
        title: "Do-follow, nofollow, and sponsored links in plain English",
        paragraphs: [
          "“Do-follow” is a popular name for an ordinary web link. There is no special dofollow setting that a publisher has to add. A publisher may instead label a link nofollow when it does not want to endorse the destination, or sponsored when payment or another commercial arrangement influenced the link.",
          "A paid placement should not be sold as guaranteed search authority. Google asks publishers to qualify paid links, and responsible directories follow that rule. Shipyard marks paid direct website links as sponsored. The placement is designed to create relevant visibility and referral visits, not to sell a secret ranking shortcut.",
        ],
        bullets: [
          "Ordinary link: a normal editorial link chosen without payment",
          "Nofollow link: a link the publisher does not want to treat as an endorsement",
          "Sponsored link: a link connected to advertising, payment, or promotion",
          "Referral link value: real visitors can still use any working link",
        ],
      },
      {
        id: "dr",
        title: "What Domain Rating can and cannot tell you",
        paragraphs: [
          "Domain Rating, often shortened to DR, is a metric created by an SEO tool provider to compare the relative strength of website backlink profiles. It can be useful for tracking broad progress or comparing similar sites inside the same tool. It is not used by Google, and different SEO tools can show different authority scores for the same domain.",
          "A higher score does not automatically mean more customers or better rankings. A starting site should pair link growth with relevant search impressions, qualified referral visits, sign-ups, and revenue. That keeps the team focused on business value instead of chasing a badge.",
        ],
      },
      {
        id: "earn",
        title: "Create reasons for people to link to your startup",
        paragraphs: [
          "The easiest outreach begins with a useful destination. Publish an original benchmark, a free tool, a clear template, a detailed comparison, a public dataset, or a guide based on questions customers repeatedly ask. Make it easy to understand without requiring a sales call.",
          "Then identify people already writing about the problem. Send a short note explaining the resource and why it helps their audience. Do not demand a link, hide the commercial relationship, or send hundreds of identical messages. A small number of relevant conversations is a more durable strategy.",
        ],
        bullets: [
          "Original data or a transparent benchmark from your product's market",
          "A free calculator, generator, checklist, template, or reference page",
          "A well-researched answer to a narrow problem in your category",
          "A customer story with specific process and outcome details",
          "Integration documentation that helps users connect two products",
        ],
      },
      {
        id: "directories",
        title: "Use product directories as discovery and citation layers",
        paragraphs: [
          "Relevant product directories can give a new company a stable public profile, category context, referral visits, and another place for customers or writers to verify the product. Complete listings are more credible than name-and-link pages, so add accurate descriptions, screenshots, pricing, platforms, maker details, and updates.",
          "A directory listing may contribute to a broader authority-building program, but it should not be presented as a guaranteed DR boost. The strongest outcome is that the right person discovers the product, uses it, and later mentions it in a review, resource page, article, integration guide, or community discussion.",
        ],
      },
      {
        id: "plan",
        title: "A simple 30-day backlink plan for a new startup",
        paragraphs: [
          "Choose one link-worthy asset and one accurate product story. Publish both on your own domain, then build a short list of directories, partners, customers, communities, and writers whose audiences genuinely overlap with yours. Personalize the reason each person might care.",
          "Track published mentions, referral visits, conversations, and search impressions. Review the links for relevance and accuracy, not only authority score. Repeat the type of work that creates useful visits or relationships, and decline offers that promise instant rankings through undisclosed paid links.",
        ],
        bullets: [
          "Week 1: publish a useful asset and improve the product landing page",
          "Week 2: complete five to ten relevant directory and partner profiles",
          "Week 3: contact customers, integration partners, and focused publications",
          "Week 4: measure results, update weak pages, and plan the next asset",
        ],
      },
    ],
    faqs: [
      {
        question: "Does a do-follow link guarantee higher rankings?",
        answer:
          "No. An ordinary link can be one useful signal, but rankings depend on relevance, page quality, competition, technical access, and many other factors. No publisher can guarantee a result from one link.",
      },
      {
        question: "Can a product directory increase Domain Rating?",
        answer:
          "A relevant directory may become part of a healthy backlink profile and can create referral discovery. Domain Rating changes depend on the tool's own index and scoring, so a specific increase should never be promised.",
      },
      {
        question: "Are sponsored links useless?",
        answer:
          "No. A sponsored link can still send qualified visitors, support a campaign, and help people move from a directory to your product. The sponsored label simply makes the commercial relationship clear to search engines.",
      },
      {
        question: "What backlinks should a new startup pursue first?",
        answer:
          "Start with relevant product and industry directories, partner or integration pages, real customer mentions, founder profiles, and editorial resources that genuinely help your target audience.",
      },
    ],
    relatedSlugs: ["submit-product-to-directories", "product-launch-checklist"],
  },
] as const satisfies readonly GuideDefinition[]

export const GUIDE_SLUGS = GUIDES.map((guide) => guide.slug)

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug)
}
