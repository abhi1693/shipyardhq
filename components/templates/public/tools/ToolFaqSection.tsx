import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import type { FreeToolFaq } from "@/lib/tools/types"

export function ToolFaqSection({
  items,
  heading = "Frequently asked questions",
}: {
  items: readonly FreeToolFaq[]
  heading?: string
}) {
  if (!items.length) return null

  return (
    <section
      aria-labelledby="tool-faq-heading"
      className="rounded-xl border border-[#e2e8f0] bg-white p-5 md:p-8"
    >
      <p className="text-sm font-semibold text-[#0051d5]">Good to know</p>
      <h2
        id="tool-faq-heading"
        className="mt-1 text-balance text-2xl font-bold text-[#0b1c30]"
      >
        {heading}
      </h2>
      <Accordion type="single" collapsible className="mt-5">
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`faq-${index + 1}`}
            className="border-[#e2e8f0]"
          >
            <AccordionTrigger className="px-0 py-5 text-base font-semibold text-[#0b1c30] hover:bg-transparent">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pr-8 text-pretty text-sm leading-6 text-[#43474c]">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
