"use client"

import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Rocket, Sparkles, Users } from "lucide-react"

export default function Hero() {
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
          Submit your product in minutes and reach a community of real users and builders.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/member/products/add">
            <Button size="lg" className="shadow-sm">
              <Rocket className="mr-2 h-4 w-4" /> Submit Your Product
            </Button>
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="outline" className="">
              Explore Products
            </Button>
          </Link>
        </div>

        {/* Benefits */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {/* Card 1 */}
          <div className="rounded-xl border bg-card/80 p-5 shadow-sm transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--brand-1)]/30">
            <div className="inline-flex items-center justify-center rounded-md p-2 bg-[color:var(--brand-1)]/12 text-[color:var(--brand-1)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-3 font-semibold">Featured placement</div>
            <p className="mt-1 text-sm text-muted-foreground">Get highlighted across categories and feeds.</p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border bg-card/80 p-5 shadow-sm transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--brand-2)]/30">
            <div className="inline-flex items-center justify-center rounded-md p-2 bg-[color:var(--brand-2)]/12 text-[color:var(--brand-2)]">
              <Users className="h-4 w-4" />
            </div>
            <div className="mt-3 font-semibold">Real audience</div>
            <p className="mt-1 text-sm text-muted-foreground">Reach makers, not just algorithms.</p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border bg-card/80 p-5 shadow-sm transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--brand-3)]/30">
            <div className="inline-flex items-center justify-center rounded-md p-2 bg-[color:var(--brand-3)]/12 text-[color:var(--brand-3)]">
              <Rocket className="h-4 w-4" />
            </div>
            <div className="mt-3 font-semibold">Frictionless launch</div>
            <p className="mt-1 text-sm text-muted-foreground">Submit in minutes, not weeks.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
