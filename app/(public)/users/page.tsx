import Link from "next/link"
import { getPublicUsersWithCounts } from "@/actions/public/users/actions"
import PublicContainer from "@/components/layout/PublicContainer"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/metadata"

export const revalidate = 120

const baseMetadata = buildPageMetadata({
  title: "Users",
  description:
    "Discover makers and explore their published products on ShipYardHQ.",
  openGraph: {
    url: "/users",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: { canonical: "/users" },
}

export default async function UsersIndexPage() {
  const users = await getPublicUsersWithCounts(48)

  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_0%_0%,var(--brand-2)/0.12,transparent_60%),radial-gradient(110%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(80% 110% at 50% 5%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        paddingY="py-20"
        max="7xl"
        className="relative"
      >
        <div className="relative isolate mx-auto flex max-w-5xl flex-col gap-10 overflow-hidden rounded-[2.5rem] border border-[color:var(--brand-1)/0.16] bg-background/88 px-10 py-12 shadow-[0_60px_150px_-90px_rgba(7,58,104,0.85)] backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(100%_80%_at_0%_0%,var(--brand-2)/0.18,transparent_55%),radial-gradient(120%_110%_at_100%_0%,var(--brand-3)/0.18,transparent_72%)]"
          />

          <div className="relative space-y-8 text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
              Crew Roster
            </span>
            <header className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Makers charting new waters
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Explore creators and the products they’ve launched across the
                harbor.
              </p>
            </header>
          </div>

          {users.length === 0 ? (
            <div className="relative rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/85 px-6 py-10 text-center text-sm text-muted-foreground backdrop-blur">
              No creators to show yet.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => {
                const fullName =
                  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "User"
                const count = u.products.length
                return (
                  <li key={u.id} className="group">
                    <Link
                      href={`/users/${u.id}`}
                      className="group relative block overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-6 py-5 shadow-[0_30px_75px_-60px_rgba(7,58,104,0.65)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.35] hover:shadow-[0_35px_85px_-55px_rgba(7,58,104,0.7)]"
                    >
                      <div className="text-lg font-semibold text-foreground transition-colors group-hover:text-[color:var(--brand-1)]">
                        {fullName}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {count} published product{count === 1 ? "" : "s"}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PublicContainer>
    </main>
  )
}
