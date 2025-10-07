import Link from "next/link"

import { Button } from "@/components/atoms/button"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

const steps = [
  {
    title: "Submit your launch",
    description:
      "Share your product story, assets, and launch window so we can tee up homepage and featured eligibility.",
  },
  {
    title: "Activate placements",
    description:
      "Choose sponsored slots or earn editorial consideration to get surfaced across the homepage, featured lanes, and category feeds.",
  },
  {
    title: "Track momentum",
    description:
      "Monitor upvotes, category momentum, and leaderboard movement to guide updates after you ship.",
  },
] as const

export function DirectoryHowItWorks() {
  return (
    <section className="rounded-3xl border border-border bg-white px-6 py-12 shadow-sm md:px-12">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          How it works
        </span>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Get your launch in front of the Shipyard audience
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Shipyard makes it simple to publish, promote, and analyze your launch. Work through the steps below and you will be visible across homepage spotlights, featured collections, and the live leaderboard.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 transition-transform hover:-translate-y-1"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-2">
          <Link href={MEMBER_PRODUCTS_PATH}>Submit your launch</Link>
        </Button>
      </div>
    </section>
  )
}

export default DirectoryHowItWorks
