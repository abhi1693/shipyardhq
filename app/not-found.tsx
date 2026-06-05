import Link from "next/link"
import { ArrowRight, BarChart3, Compass, Rocket, Trophy } from "lucide-react"

import { Button } from "@/components/atoms/button"
import PublicFooter from "@/components/layout/footers/public-footer"
import PublicHeader from "@/components/layout/headers/public-header"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
} from "@/lib/routes"

const destinations = [
  {
    title: "New Tech",
    description: "Discover the latest high-performance software launches.",
    href: BROWSE_PATH,
    icon: Compass,
    iconClassName: "text-[#0051d5]",
  },
  {
    title: "Live Analytics",
    description: "See real-time traffic and discovery signals across Shipyard.",
    href: ANALYTICS_PATH,
    icon: BarChart3,
    iconClassName: "text-[#16a34a]",
  },
  {
    title: "Daily Drops",
    description: "Find fresh launches and products moving up the leaderboard.",
    href: LEADERBOARD_PATH,
    icon: Rocket,
    iconClassName: "text-[#F97316]",
  },
] as const

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30]">
      <PublicHeader />
      <main className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center overflow-hidden pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(#d3e4fe_0.75px,transparent_0.75px)] [background-size:24px_24px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#dce9ff] to-transparent opacity-70"
          aria-hidden
        />

        <section className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-16 text-center sm:px-6 md:py-24">
          <div className="relative mx-auto mb-6 flex min-h-[180px] items-center justify-center sm:min-h-[260px]">
            <h1
              className="select-none text-[9rem] font-black leading-none tracking-normal text-black/[0.04] sm:text-[14rem] md:text-[20rem]"
              aria-hidden
            >
              404
            </h1>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mb-3 rounded-full bg-[#C0FF00] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-black">
                System Interruption
              </span>
              <h2 className="text-3xl font-bold leading-10 text-black sm:text-5xl md:text-[64px] md:leading-[72px]">
                Lost at sea?
              </h2>
            </div>
          </div>

          <p className="mx-auto max-w-2xl text-base leading-6 text-[#43474c] sm:text-lg sm:leading-7">
            The page you are looking for has drifted off course or never
            existed. Let&apos;s get you back to the makers and high-performance
            discoveries.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="h-auto w-full rounded-lg border-0 bg-black px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-[#346cef] sm:w-auto"
            >
              <Link href={BROWSE_PATH}>
                Back to Discovery
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto w-full rounded-lg border-[#E2E8F0] bg-[#eff4ff] px-8 py-4 text-base font-semibold text-black shadow-none hover:bg-[#dce9ff] sm:w-auto"
            >
              <Link href={LEADERBOARD_PATH}>
                <Trophy className="size-5" aria-hidden />
                View Leaderboard
              </Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
            {destinations.map((destination) => {
              const Icon = destination.icon

              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  className="group rounded-lg border border-[#E2E8F0] bg-white p-6 transition-all hover:border-[#0051d5] hover:shadow-md"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-[#eff4ff]">
                    <Icon
                      className={`size-5 ${destination.iconClassName}`}
                      aria-hidden
                    />
                  </div>
                  <h3 className="text-lg font-semibold leading-6 text-black">
                    {destination.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-[#43474c]">
                    {destination.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5]">
                    Open
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="mt-6">
            <Button
              asChild
              variant="ghost"
              className="h-auto rounded-lg px-4 py-2 text-sm font-semibold text-[#43474c] hover:bg-[#eff4ff] hover:text-black"
            >
              <Link href={MEMBER_PRODUCTS_ADD_PATH}>Submit your product</Link>
            </Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
