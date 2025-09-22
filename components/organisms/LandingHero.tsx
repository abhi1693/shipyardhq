"use client"

import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Ship } from "lucide-react"
import SubmitProductButton from "@/components/molecules/SubmitProductButton"

type Stats = {
  totalProducts?: number
  totalCreators?: number
  totalUpvotes?: number
}

export default function Hero({ stats }: { stats?: Stats }) {
  const totalProducts = stats?.totalProducts ?? 0
  const totalCreators = stats?.totalCreators ?? 0
  const totalUpvotes = stats?.totalUpvotes ?? 0

  const formattedProducts = totalProducts.toLocaleString()
  const formattedCreators = totalCreators.toLocaleString()
  const formattedUpvotes = totalUpvotes.toLocaleString()

  return (
    <section className="relative isolate w-full overflow-hidden border-b bg-background/90 py-20 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_10%_0%,var(--brand-1)/0.2,transparent_68%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(100%_80%_at_85%_-10%,var(--brand-2)/0.18,transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.45] to-transparent opacity-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10, 52, 88, 0.12) 1px, transparent 1px), linear-gradient(180deg, rgba(10, 52, 88, 0.12) 1px, transparent 1px)",
          backgroundSize: "140px 140px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[color:var(--brand-1)/0.28] via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-12 -z-10 h-32 blur-3xl bg-[radial-gradient(70%_100%_at_50%_0%,var(--brand-3)/0.22,transparent_78%)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.4] bg-background/80 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.26em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
          <Ship className="h-3.5 w-3.5" />
          Shipyard Fleet
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl xl:text-6xl bg-clip-text bg-[linear-gradient(92deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
          Set sail to your next product launch.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
          Bring your latest build aboard a crew of early adopters and fellow
          makers charting the next horizon.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/member/products">
            <SubmitProductButton
              size="lg"
              className="shadow-[0px_25px_50px_-30px_rgba(7,58,104,0.65)]"
              label="Submit Your Product"
            />
          </Link>
          <Link href="/browse">
            <Button
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.35] bg-background/70 text-[color:var(--brand-1)] shadow-[0px_18px_40px_-32px_rgba(7,58,104,0.75)]"
            >
              Explore Products
            </Button>
          </Link>
        </div>

        {stats && (
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-5 text-center shadow-[0px_25px_50px_-28px_rgba(7,58,104,0.85)] backdrop-blur">
                <div className="text-3xl font-semibold tracking-tight text-[color:var(--brand-1)] sm:text-4xl">
                  {formattedProducts}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Products Listed
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-5 text-center shadow-[0px_25px_50px_-28px_rgba(7,58,104,0.85)] backdrop-blur">
                <div className="text-3xl font-semibold tracking-tight text-[color:var(--brand-1)] sm:text-4xl">
                  {formattedCreators}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Makers Onboard
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-5 text-center shadow-[0px_25px_50px_-28px_rgba(7,58,104,0.85)] backdrop-blur">
                <div className="text-3xl font-semibold tracking-tight text-[color:var(--brand-1)] sm:text-4xl">
                  {formattedUpvotes}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Community Upvotes
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
