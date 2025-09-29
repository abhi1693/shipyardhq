import { ReactNode } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"

export const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: "What analytics are included on the Free plan?",
    answer: (
      <div className="space-y-3">
        <p>
          Every listing now ships with baseline analytics so you can watch
          traction without upgrading.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Lifetime vote and click totals to gauge overall demand</li>
          <li>Total page views across your launch window</li>
          <li>Interactive trends with selectable ranges from 7 to 90 days</li>
          <li>
            One Insights pipeline run every week for competitive and community
            research
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "What is Shipyard Insights?",
    answer: (
      <div className="space-y-3">
        <p>
          Insights is our automated research pipeline. It pairs your analytics
          with competitive intel, community sentiment, and prioritized action
          items in a single report, with the free plan including one run every
          week and higher tiers adding more credits.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Website snapshots highlight positioning gaps and quick wins</li>
          <li>
            Competitor dossiers detail differentiators, strengths, and links
          </li>
          <li>
            Community and discussion insights surface the conversations to join
          </li>
          <li>
            Executive summaries outline next experiments and success metrics
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "What extra insight do paid plans unlock?",
    answer: (
      <div className="space-y-3">
        <p>
          Paid upgrades layer in richer context so you can pinpoint what drives
          conversions.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Click-through rates split by referrer, device, and browser</li>
          <li>Visitor loyalty, retention cohorts, and repeat engagement</li>
          <li>Operating system and traffic channel breakdowns per campaign</li>
          <li>
            Additional Insights credits so you can rerun reports between major
            launches
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does analytics scale for Crew plan organizations?",
    answer: (
      <div className="space-y-3">
        <p>
          Crew plan members get an organization-wide lens that rolls every
          product into one analytics workspace.
        </p>
        <p className="text-muted-foreground">
          Compare launches across teams, surface shared momentum, and quickly
          spot products that need attention without hopping between dashboards.
        </p>
      </div>
    ),
  },
  {
    question: "How do I access analytics for a product?",
    answer: (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open the Member View from the main navigation.</li>
          <li>Select Products to see your listings.</li>
          <li>
            Use the Analytics action on the product row you want to review.
          </li>
        </ol>
        <p>
          Dashboards refresh in near real time, so give them a quick look after
          campaigns or newsletter sends to confirm impact.
        </p>
      </div>
    ),
  },
  {
    question: "Is it free to submit a product?",
    answer:
      "Yes. Listing a product on ShipyardHQ is free—you can publish immediately or keep a draft without paying. Free listings now include the core analytics dashboard, and you can upgrade anytime for more reach and deeper reporting.",
  },
  {
    question: "How does the product submission flow work?",
    answer:
      "The four-step product wizard walks through core details, pricing, domain verification, and launch assets. A final review screen runs link and image checks so you can fix issues before you ship. You can save progress, move between steps, and publish or save as draft when you’re ready.",
  },
  {
    question: "How do I get the Verified badge on my listing?",
    answer:
      "During the verification step we generate a unique prod-verif-shipyard TXT record. Add it to your DNS, then click Verify Now from the wizard or product edit screen. Once the record resolves we persist the status so your public page shows the Verified badge until you remove the record.",
  },
  {
    question: "Can I update or relaunch after publishing?",
    answer:
      "Absolutely. Edit from your member dashboard at any time to refresh copy, swap assets, or re-run verification. You can also flip a live product back to draft while you iterate. Analytics retain historical data, so you can relaunch without losing past performance.",
  },
  {
    question: "How do I manage billing or cancel an upgrade?",
    answer:
      "Open the Billing Portal link in the member sidebar. We use Dodo Payments, so the portal lets you download invoices, update payment methods, or cancel future renewals without waiting on support.",
  },
  {
    question: "Who can create organizations or invite teammates?",
    answer:
      "Organizations unlock for makers on plans that include the collaboration feature. Eligible plans instantly expose shared analytics, team roles, and handoff tooling once a qualifying purchase is active.",
  },
  {
    question: "How do upvotes work?",
    answer:
      "Every signed-in member can toggle a single upvote per product. Votes update analytics in real time, drive the leaderboard, and help us surface trending tools while keeping spam out.",
  },
]

export function FaqSection() {
  const faqs = FAQ_ITEMS

  return (
    <section className="py-16 border-b" id="faq">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground mt-2">
            Everything you need to know before getting started.
          </p>
        </div>

        <Accordion type="multiple" className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
