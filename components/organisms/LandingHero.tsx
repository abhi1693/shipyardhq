"use client"

import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Sparkles } from "lucide-react"
import SubmitProductButton from "@/components/molecules/SubmitProductButton"

type Stats = {
  totalProducts?: number
  totalCreators?: number
  totalUpvotes?: number
}

export default function Hero({
  stats,
}: {
  stats?: Stats
}) {
  return (
    <section className="relative isolate w-full border-b py-20 md:py-32 overflow-hidden">
      {/* Brand gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-1)/0.18,transparent_70%),radial-gradient(40%_50%_at_10%_80%,var(--brand-2)/0.16,transparent_70%),radial-gradient(50%_40%_at_90%_60%,var(--brand-3)/0.14,transparent_72%)]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-2)]" />
          Built for makers. Lightning fast.
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
          Launch faster. Get discovered sooner.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Submit your product in minutes and reach a crew of real users and
          builders.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/member/products/add">
            <SubmitProductButton
              size="lg"
              className="shadow-sm"
              label="Submit Your Product"
            />
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="outline" className="">
              Explore Products
            </Button>
          </Link>
        </div>

        {/* Stat view */}
        {stats && (
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 overflow-hidden rounded-xl border bg-background/60 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x">
              <div className="p-5 text-center">
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight animate-count-bump">
                  {(stats.totalProducts ?? 0).toLocaleString()
                    .toString()
                    .replace(/,/g, ",")}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Products listed
                </div>
              </div>
              <div className="p-5 text-center">
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight animate-count-bump">
                  {(stats.totalCreators ?? 0).toLocaleString()
                    .toString()
                    .replace(/,/g, ",")}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Makers onboard
                </div>
              </div>
              <div className="p-5 text-center">
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight animate-count-bump">
                  {(stats.totalUpvotes ?? 0).toLocaleString()
                    .toString()
                    .replace(/,/g, ",")}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Community upvotes
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
