"use client"

import Link from "next/link"
import { Compass, Anchor } from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import { Button } from "@/components/atoms/button"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export function JoinCrewCTA() {
  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-24"
      className="relative"
      innerClassName="relative flex justify-center"
      fillScreen={false}
    >
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 rounded-3xl border border-border bg-white px-8 py-14 text-center shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
          <Compass className="h-4 w-4" /> Join the crew
        </span>
        <div className="space-y-5">
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Ready to chart your next voyage?
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            Bring your product aboard or scout the fleet for fresh inspiration.
            The harbor is open 24/7 for makers and explorers alike.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link href={MEMBER_PRODUCTS_PATH}>
            <Button
              size="lg"
              className="gap-2 shadow-[0px_25px_55px_-35px_rgba(7,58,104,0.85)]"
            >
              <Anchor className="h-4 w-4" /> Submit a launch
            </Button>
          </Link>
          <Link
            href={BROWSE_PATH}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            Explore the fleet
          </Link>
        </div>
      </div>
    </PublicContainer>
  )
}

export default JoinCrewCTA
