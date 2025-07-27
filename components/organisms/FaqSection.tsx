import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"

export function FaqSection() {
  const faqs = [
    {
      question: "Is it free to submit a product?",
      answer:
        "Yes. You can submit your product for free and get listed. We also offer optional paid plans to get featured or gain more visibility.",
    },
    {
      question: "How do you decide which products get featured?",
      answer:
        "Featured products are manually curated based on quality, relevance, and user traction. Paid placements are also available.",
    },
    {
      question: "Can I update my product after publishing?",
      answer:
        "Yes, you can edit your product’s details, logo, and category from your dashboard at any time.",
    },
    {
      question: "Do I need to create an account to vote?",
      answer:
        "Yes, we require users to sign in before voting to maintain vote integrity and prevent spam.",
    },
  ]

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
