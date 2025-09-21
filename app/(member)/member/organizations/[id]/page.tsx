import Link from "next/link"
import { redirect } from "next/navigation"
import type { ComponentType } from "react"
import {
  getMyOrganizationById,
  getMyOrganizationMembers,
  getMyOrganizationProducts,
  getMyAvailableProductsForOrganization,
  attachProductToOrganizationAction,
} from "@/actions/member/organizations/actions"
import { auth } from "@clerk/nextjs/server"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import PageContainer from "@/components/layout/page-container"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { MemberOrganizationMembersRelationship } from "./relationships/members"
import { ensureUrlHasSchema } from "@/lib/utils"
import { organizationHasAdvancedAnalytics } from "@/lib/server/analytics/organizationAccess"
import {
  Globe,
  Users,
  CalendarClock,
  ExternalLink,
  Pencil,
  ShieldCheck,
  Link2,
  BarChart3,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function MemberOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = (await getMyOrganizationById(id)) as {
    id: string
    name: string
    url: string
    createdAt: Date
    updatedAt: Date | null
    ownerUserId?: string | null
  } | null
  if (!org) {
    redirect("/member/organizations")
  }

  // Determine if current user is the owner
  const { userId: clerkId } = await auth()
  let isOwner = false
  if (clerkId) {
    const me = await requireActiveUserOrRedirect(clerkId)
    if (me && org.ownerUserId) {
      isOwner = org.ownerUserId === me.id
    }
  }
  const [members, organizationProducts, availableProducts, hasAdvancedAnalytics] =
    await Promise.all([
      getMyOrganizationMembers(id),
      getMyOrganizationProducts(id),
      getMyAvailableProductsForOrganization(id),
      organizationHasAdvancedAnalytics(org.id),
    ])

  const organizationUrl = ensureUrlHasSchema(org.url)
  const domainDisplay = getDisplayUrl(organizationUrl)
  const memberCount = members.length
  const owner = members.find((member) => member.isOwner)
  const ownerName = owner ? getMemberName(owner) : "Unassigned"
  const ownerEmail = owner?.user.email ?? null
  const ownerSince = owner
    ? formatDistanceToNow(new Date(owner.createdAt), { addSuffix: true })
    : null
  const createdLabel = formatDistanceToNow(new Date(org.createdAt), {
    addSuffix: true,
  })
  const updatedLabel = formatDistanceToNow(
    new Date(org.updatedAt ?? org.createdAt),
    {
      addSuffix: true,
    },
  )

  const infoChips = [
    {
      icon: Globe,
      label: domainDisplay,
      href: organizationUrl,
    },
    {
      icon: Users,
      label: `${memberCount} ${memberCount === 1 ? "member" : "members"}`,
    },
    {
      icon: CalendarClock,
      label: `Created ${createdLabel}`,
    },
  ]

  const infoItems = [
    {
      label: "Domain",
      value: (
        <Link
          href={organizationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          {domainDisplay}
        </Link>
      ),
    },
    {
      label: "Created",
      value: <span className="text-sm text-slate-700">{createdLabel}</span>,
    },
    {
      label: "Last updated",
      value: <span className="text-sm text-slate-700">{updatedLabel}</span>,
    },
    {
      label: "Members",
      value: (
        <span className="text-sm text-slate-700">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      ),
    },
  ]

  const attachProductAction = attachProductToOrganizationAction.bind(null, {
    organizationId: org.id,
    redirectPath: `/member/organizations/${org.id}`,
  })

  return (
    <PageContainer>
      <div className="space-y-8 py-10">
        <div className="flex flex-col gap-5 rounded-3xl border border-[color:var(--brand-1)/0.08] bg-white/80 px-6 py-8 shadow-[0_24px_56px_-40px_rgba(7,78,134,0.45)] backdrop-blur sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="uppercase tracking-[0.28em] text-[11px] text-muted-foreground"
            >
              Organization
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                {org.name}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                Align your crew, billing, and roles inside a dedicated
                organization built for Shipyard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {infoChips.map((chip) => (
                <InfoChip key={chip.label} {...chip} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 md:justify-end">
            {hasAdvancedAnalytics ? (
              <Button asChild size="sm">
                <Link href={`/member/organizations/${org.id}/analytics`}>
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link
                href={organizationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" /> Visit site
              </Link>
            </Button>
            {isOwner ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/member/organizations/${org.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit details
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border border-transparent bg-white/90 shadow-none lg:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Organization overview
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Keep essential metadata handy as you collaborate across
                Shipyard.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4">
              <dl className="grid gap-6 sm:grid-cols-2">
                {infoItems.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {item.label}
                    </p>
                    <div>{item.value}</div>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="border border-transparent bg-white/90 shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Ownership
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Manage who has final say on billing and membership.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-4">
              {owner ? (
                <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {ownerName}
                      </p>
                      {ownerEmail ? (
                        <p className="text-xs text-muted-foreground">
                          {ownerEmail}
                        </p>
                      ) : null}
                      {ownerSince ? (
                        <p className="text-xs text-muted-foreground">
                          Owner since {ownerSince}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                  No owner assigned yet. Assign an owner to unlock full
                  controls.
                </div>
              )}

              {isOwner ? (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/member/organizations/${org.id}/owner`}>
                    <ShieldCheck className="h-4 w-4" /> Update ownership
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <ConnectedProductsCard
          products={organizationProducts as OrganizationProduct[]}
          availableProducts={availableProducts as AvailableProduct[]}
          isOwner={isOwner}
          attachProductAction={attachProductAction}
        />

        <MemberOrganizationMembersRelationship
          rows={members as any}
          organizationId={org.id}
          canManage={isOwner}
        />
      </div>
    </PageContainer>
  )
}

function getDisplayUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  }
}

function getMemberName(row: {
  user: { firstName: string | null; lastName: string | null; email: string }
}) {
  const full = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim()
  return full.length ? full : row.user.email
}

function InfoChip({
  icon: Icon,
  label,
  href,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  href?: string
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="transition hover:-translate-y-[1px] hover:shadow-lg"
      >
        {content}
      </Link>
    )
  }

  return content
}

type OrganizationProduct = Awaited<
  ReturnType<typeof getMyOrganizationProducts>
>[number]

type AvailableProduct = Awaited<
  ReturnType<typeof getMyAvailableProductsForOrganization>
>[number]

function ConnectedProductsCard({
  products,
  availableProducts,
  isOwner,
  attachProductAction,
}: {
  products: OrganizationProduct[]
  availableProducts: AvailableProduct[]
  isOwner: boolean
  attachProductAction: (formData: FormData) => Promise<any>
}) {
  const hasProducts = products.length > 0
  const firstAvailable = availableProducts[0]?.id ?? ""

  return (
    <Card className="border border-transparent bg-white/90 shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Connected products
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Surface launches tied to this workspace so your crew has one source of
          truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-6 pt-4">
        {isOwner ? (
          <div className="px-6">
            {availableProducts.length ? (
              <form
                action={attachProductAction}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Connect existing product
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Choose from your unassigned products to associate it with
                    this organization.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    id="productId"
                    name="productId"
                    defaultValue={firstAvailable}
                    className="h-9 min-w-[12rem] rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-[color:var(--brand-1)/0.45] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-1)/0.2]"
                    required
                  >
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.slug}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm">
                    <Link2 className="h-4 w-4" /> Connect
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                All of your products are already connected. Launch something new
                to link it here.
              </div>
            )}
          </div>
        ) : null}

        {hasProducts ? (
          <ul className="divide-y divide-slate-200/70">
            {products.map((product) => {
              const statusVariant =
                product.status === "draft"
                  ? "secondary"
                  : product.status === "archived"
                    ? "outline"
                    : "success"
              const updatedLabel = formatDistanceToNow(
                new Date(product.updatedAt ?? product.createdAt),
                { addSuffix: true },
              )
              const ownerLabel = formatProductOwner(product.user)
              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/member/products/${product.slug}`}
                        className="text-sm font-semibold text-slate-900 transition hover:text-[color:var(--brand-1)]"
                      >
                        {product.name}
                      </Link>
                      <Badge
                        variant={statusVariant}
                        className="rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {String(product.status || "").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px] text-slate-500">
                        {product.slug}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Users className="h-3.5 w-3.5 text-slate-300" />
                        Owned by {ownerLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:items-end">
                    {product.plan?.name ? (
                      <Badge
                        className="w-fit rounded-full border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                        variant="outline"
                      >
                        Plan · {product.plan.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">
                        Plan · Not assigned
                      </span>
                    )}
                    <span className="text-slate-500">
                      Updated {updatedLabel}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-6">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
              {isOwner
                ? "No products connected yet. Use the form above to link existing launches."
                : "No products have been connected to this organization yet."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatProductOwner(user: {
  firstName: string | null
  lastName: string | null
  email: string
}) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return full.length ? full : user.email
}
