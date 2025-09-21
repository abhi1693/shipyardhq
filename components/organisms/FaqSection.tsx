import { ReactNode } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"

export const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: "Is it free to submit a product?",
    answer:
      "Yes. Listing a product on ShipYardHQ is free—you can publish immediately or keep a draft without paying. Paid upgrades simply layer on extra reach such as featured badges, homepage placement, newsletter promotion, sticky banners, custom CTAs, and priority placement in browse results.",
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
      "Absolutely. Edit from your member dashboard at any time to refresh copy, swap assets, or re-run verification. You can also flip a live product back to draft while you iterate, then republish when it’s polished.",
  },
  {
    question: "What do paid plans unlock?",
    answer:
      "Paid plans unlock additional exposure and tooling—think featured badges, homepage placement, sticky hero banners, newsletter promotion, early access perks, do-follow backlinks, custom CTA buttons, and richer analytics. You can upgrade any product whenever you need a boost.",
  },
  {
    question: "How do I manage billing or cancel an upgrade?",
    answer:
      "Open the Billing Portal link in the member sidebar. We use Dodo Payments, so the portal lets you download invoices, update payment methods, or cancel future renewals without waiting on support.",
  },
  {
    question: "Who can create organizations or invite teammates?",
    answer:
      "Organizations unlock for makers on plans that include the organization feature. If you don’t have access yet you’ll see an upsell screen with eligible plans, and the collaboration tools stay hidden until a qualifying purchase is active.",
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
