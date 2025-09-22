"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { BROWSE_PATH, HOME_PATH } from "@/lib/routes"

export default function NotFound() {
  const router = useRouter()

  return (
    <section className="relative isolate w-full min-h-[70vh] py-20 md:py-28 overflow-hidden flex items-center">
      {/* Brand gradient backdrop to match the app's look */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-1)/0.18,transparent_70%),radial-gradient(40%_50%_at_10%_80%,var(--brand-2)/0.16,transparent_70%),radial-gradient(50%_40%_at_90%_60%,var(--brand-3)/0.14,transparent_72%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Large gradient 404 to align with branding */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-extrabold leading-none tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
          404
        </h1>

        <h2 className="mt-6 text-2xl md:text-3xl font-semibold">
          Page not found
        </h2>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          Sorry, we couldn’t find that page. It may have been moved or deleted.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Button size="lg" onClick={() => router.back()}>
            Go Back
          </Button>
          <Link href={HOME_PATH} passHref>
            <Button asChild size="lg" variant="outline">
              <a aria-label="Back to home">Back to Home</a>
            </Button>
          </Link>
          <Link href={BROWSE_PATH} passHref>
            <Button asChild size="lg" variant="ghost">
              <a aria-label="Browse products">Browse Products</a>
            </Button>
          </Link>
        </div>

        {/* Subtle card hint for consistency with surfaces */}
        <div className="mt-12 mx-auto max-w-xl rounded-xl border bg-card/80 p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Looking for something specific? Try exploring our categories or the
            leaderboard to discover trending micro‑SaaS projects.
          </p>
        </div>
      </div>
    </section>
  )
}
