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
        <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
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

        {/* Quick benefits */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="rounded-lg border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-[color:var(--brand-1)]" /> Featured placement</div>
            <p className="mt-1 text-sm text-muted-foreground">Get highlighted across categories and feeds.</p>
          </div>
          <div className="rounded-lg border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-[color:var(--brand-2)]" /> Real audience</div>
            <p className="mt-1 text-sm text-muted-foreground">Reach makers, not just algorithms.</p>
          </div>
          <div className="rounded-lg border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold"><Rocket className="h-4 w-4 text-[color:var(--brand-3)]" /> Frictionless launch</div>
            <p className="mt-1 text-sm text-muted-foreground">Submit in minutes, not weeks.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
