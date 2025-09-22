"use client"

import Link from "next/link"
import { Compass, Anchor } from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import { Button } from "@/components/atoms/button"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { getWaveBackground } from "@/lib/nautical"

export function JoinCrewCTA() {
  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-24"
      className="relative overflow-hidden bg-background/92 shadow-[0px_50px_140px_-90px_rgba(7,58,104,0.95)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.45] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(120%_90%_at_10%_-10%, rgba(7, 58, 104, 0.28), transparent 78%), radial-gradient(105%_85%_at_90%_-5%, rgba(16, 88, 142, 0.22), transparent 75%)",
          maskImage:
            "radial-gradient(85%_110%_at_50%_0%, rgba(0,0,0,0.95), transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("240px 90px"),
          backgroundPosition: "0 60%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-30%] bottom-[-70px] -z-40 h-60 rounded-[50%] bg-[radial-gradient(80%_100%_at_50%_0%,var(--brand-2)/0.26,transparent_85%)] blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
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
            className="inline-flex items-center gap-2 rounded-md border border-[color:var(--brand-1)/0.35] bg-background/75 px-4 py-2 text-sm font-medium text-[color:var(--brand-1)] shadow-[0px_20px_45px_-32px_rgba(7,58,104,0.75)] transition-colors hover:bg-[color:var(--brand-1)/0.05]"
          >
            Explore the fleet
          </Link>
        </div>
      </div>
    </PublicContainer>
  )
}

export default JoinCrewCTA
