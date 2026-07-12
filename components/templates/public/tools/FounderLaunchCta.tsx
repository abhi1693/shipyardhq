import Link from "next/link"
import { ArrowRight, Rocket } from "lucide-react"

import { BROWSE_PATH, MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

export function FounderLaunchCta() {
  return (
    <section className="rounded-xl bg-[#061d31] p-6 text-white md:p-8">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <span className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10 text-[#c0ff00]">
            <Rocket className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-balance text-2xl font-bold text-white md:text-3xl">
            Put your optimized product page in front of founders
          </h2>
          <p className="mt-3 text-pretty text-sm leading-6 text-[#d0e4ff]/80 md:text-base">
            Launch on Shipyard to publish your product, earn early feedback, and
            give the founder community a place to discover what you built.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row md:flex-col">
          <Link
            href={MEMBER_PRODUCTS_ADD_PATH}
            prefetch={false}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c0ff00] px-5 py-3 text-sm font-bold text-black hover:bg-[#d6ff47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#061d31]"
          >
            Launch your product
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={BROWSE_PATH}
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#061d31]"
          >
            Browse recent launches
          </Link>
        </div>
      </div>
    </section>
  )
}
