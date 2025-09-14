import type { Metadata } from "next"
import Link from "next/link"
import prisma from "@/lib/prisma"
import PublicContainer from "@/components/layout/PublicContainer"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Users | ShipYardHQ",
  description:
    "Discover makers and explore their published products on ShipYardHQ.",
  alternates: { canonical: "/users" },
  openGraph: {
    title: "Users | ShipYardHQ",
    description: "Discover makers and explore their published products.",
    url: "/users",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Users | ShipYardHQ",
    description: "Discover makers and explore their published products.",
  },
}

export default async function UsersIndexPage() {
  // List users who have at least one published product
  const users = await prisma.user.findMany({
    where: { products: { some: { status: "published" as any } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      products: { where: { status: "published" as any }, select: { id: true } },
    },
    orderBy: { products: { _count: "desc" } },
    take: 48,
  })

  return (
    <PublicContainer paddingY="py-10" max="7xl">
      <div className="space-y-8">
        <Breadcrumbs items={[{ title: "Users" }]} />
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Makers</h1>
          <p className="text-muted-foreground">
            Explore creators and their launched products on ShipYardHQ.
          </p>
        </header>

        {users.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No creators to show yet.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {users.map((u) => {
              const fullName =
                `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "User"
              const count = u.products.length
              return (
                <li key={u.id} className="border rounded-lg p-4 bg-background">
                  <Link href={`/users/${u.id}`} className="group block">
                    <div className="text-lg font-semibold group-hover:underline">
                      {fullName}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
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
  )
}
