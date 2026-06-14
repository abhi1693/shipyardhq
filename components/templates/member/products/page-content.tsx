import Link from "next/link"
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Megaphone,
  Monitor,
  Network,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"

import { getUserProducts } from "@/actions/member/products/actions"
import type { MemberProductRow } from "@/app/(member)/member/products/columns"
import { Image } from "@/components/atoms/image"
import ProductDraftStartButton from "@/components/pages/products/ProductDraftStartButton"
import {
  WHY_SHIPYARD_PATH,
  memberProductAnalyticsPath,
  memberProductDeletePath,
  memberProductEditPath,
  memberProductPath,
  memberProductUpgradePath,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

const logoToneClasses = [
  "bg-black text-white",
  "bg-[#0051d5] text-white",
  "border border-[#E2E8F0] bg-[#e5eeff] text-[#0b1c30]",
  "border border-[#E2E8F0] bg-[#d3e4fe] text-[#0b1c30]",
]

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return initials || "SY"
}

function formatStatus(status: unknown) {
  return String(status || "draft").replace(/_/g, " ")
}

function getStatusClassName(status: unknown) {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "published") {
    return "bg-[#16a34a]/10 text-[#16a34a]"
  }
  if (normalized === "archived") {
    return "bg-[#ffdad6] text-[#93000a]"
  }
  return "bg-[#dce9ff] text-[#43474c]"
}

function ProductActions({ product }: { product: MemberProductRow }) {
  const iconLinkClass =
    "inline-flex size-9 items-center justify-center rounded-lg text-[#74777d] transition-colors hover:bg-[#eff4ff] hover:text-[#0051d5] active:scale-95"

  return (
    <div className="flex items-center justify-end gap-2">
      {product.canViewAnalytics ? (
        <Link
          href={memberProductAnalyticsPath(product.slug)}
          className={iconLinkClass}
          aria-label={`View analytics for ${product.name}`}
          title="Analytics"
        >
          <BarChart3 className="size-5" />
        </Link>
      ) : null}
      <Link
        href={memberProductUpgradePath(product.slug)}
        className={iconLinkClass}
        aria-label={`Promote ${product.name}`}
        title="Promote"
      >
        <Megaphone className="size-5" />
      </Link>
      <Link
        href={memberProductEditPath(product.slug)}
        className={iconLinkClass}
        aria-label={`Edit ${product.name}`}
        title="Edit"
      >
        <Pencil className="size-5" />
      </Link>
      {product.canDelete ? (
        <Link
          href={memberProductDeletePath(product.slug)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#74777d] transition-colors hover:bg-[#ffdad6] hover:text-[#ba1a1a] active:scale-95"
          aria-label={`Delete ${product.name}`}
          title="Delete"
        >
          <Trash2 className="size-5" />
        </Link>
      ) : null}
    </div>
  )
}

function ProductTable({
  products,
  total,
}: {
  products: MemberProductRow[]
  total: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-5 py-5 text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Product
              </th>
              <th className="px-5 py-5 text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Category
              </th>
              <th className="px-5 py-5 text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Plan
              </th>
              <th className="px-5 py-5 text-center text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Domain
              </th>
              <th className="px-5 py-5 text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Status
              </th>
              <th className="px-5 py-5 text-right text-[12px] font-bold uppercase tracking-[0.05em] text-[#43474c] md:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {products.map((product, index) => {
              const isDraft = String(product.status).toLowerCase() === "draft"
              const verified = Boolean(product.verification?.isVerified)
              const planName = product.plan?.name ?? "Free"
              const planIsPaid = !/^free$/i.test(planName)

              return (
                <tr
                  key={product.id}
                  className="group transition-colors hover:bg-[#F8FAFC]/70"
                >
                  <td className="px-5 py-6 md:px-6">
                    <div
                      className={cn(
                        "flex items-center gap-4",
                        isDraft ? "opacity-70" : "",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xl font-bold shadow-sm",
                          logoToneClasses[index % logoToneClasses.length],
                        )}
                      >
                        {product.logo ? (
                          <Image
                            src={product.logo}
                            alt={`${product.name} logo`}
                            width={40}
                            height={40}
                            className="size-10 object-contain"
                          />
                        ) : (
                          getInitials(product.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={
                            product.hasValidatedPlan
                              ? memberProductPath(product.slug)
                              : memberProductUpgradePath(product.slug)
                          }
                          className="block truncate text-[16px] font-bold leading-6 text-black transition-colors hover:text-[#0051d5]"
                        >
                          {product.name}
                        </Link>
                        <p className="truncate text-[11px] leading-[14px] text-[#43474c]">
                          /{product.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    {product.category ? (
                      <span className="inline-flex rounded-full border border-[#E2E8F0] bg-[#e5eeff] px-3 py-1 text-[11px] font-medium leading-[14px] text-[#43474c]">
                        {product.category.name}
                      </span>
                    ) : (
                      <span className="text-sm text-[#74777d]">None</span>
                    )}
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <span
                      className={cn(
                        "text-[14px] leading-5",
                        planIsPaid
                          ? "font-bold text-[#0051d5]"
                          : "text-[#0b1c30]",
                      )}
                    >
                      {planName}
                    </span>
                  </td>
                  <td className="px-5 py-6 text-center md:px-6">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium leading-[14px]",
                        verified
                          ? "border-[#16a34a]/20 bg-[#16a34a]/10 text-[#16a34a]"
                          : "border-[#E2E8F0] bg-[#e5eeff] text-[#43474c]",
                      )}
                    >
                      {verified ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <XCircle className="size-3.5" />
                      )}
                      {verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <span
                      className={cn(
                        "inline-flex rounded px-2.5 py-1 text-[11px] font-bold uppercase leading-[14px]",
                        getStatusClassName(product.status),
                      )}
                    >
                      {formatStatus(product.status)}
                    </span>
                  </td>
                  <td className="px-5 py-6 text-right md:px-6">
                    <ProductActions product={product} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <span className="text-[14px] font-medium leading-5 text-[#43474c]">
          Showing {products.length} of {total} products
        </span>
      </div>
    </div>
  )
}

function EmptyProductsState() {
  return (
    <div className="relative flex min-h-[calc(100vh-11rem)] items-center justify-center overflow-hidden rounded-xl px-4 py-10 sm:py-14">
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="group relative mb-6">
          <div className="absolute inset-0 scale-150 rounded-full bg-[#0051d5]/5 blur-3xl" />
          <div className="relative flex size-48 items-center justify-center overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-transform duration-500 group-hover:scale-[1.03]">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(#0051d5 1px, transparent 1px)",
                backgroundSize: "8px 8px",
              }}
            />
            <div className="relative flex flex-col items-center">
              <Rocket className="mb-3 size-20 text-[#0051d5]/30" />
              <div className="flex gap-2">
                <div className="h-1 w-8 rounded-full bg-[#0051d5]/20" />
                <div className="h-1 w-4 rounded-full bg-[#F97316]/20" />
              </div>
            </div>
            <Upload className="absolute right-4 top-4 size-5 text-[#F97316]" />
            <BarChart3 className="absolute bottom-6 left-6 size-6 text-[#0051d5]/40" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold leading-8 text-black">
          No products yet
        </h1>
        <p className="mt-3 max-w-md text-[16px] leading-6 text-[#43474c]">
          Your project portfolio starts here. Launch your first product to begin
          tracking analytics, verification, and growth.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <ProductDraftStartButton
            mode="member"
            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-black px-8 text-[18px] font-semibold leading-6 text-white shadow-lg shadow-black/10 transition-all hover:bg-[#0051d5] hover:scale-[1.02] active:scale-95"
          >
            <Plus className="size-5" />
            Add new product
          </ProductDraftStartButton>
          <Link
            href={WHY_SHIPYARD_PATH}
            className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0051d5] underline-offset-4 hover:underline"
          >
            <BookOpen className="size-4" />
            Read onboarding guide
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-3 opacity-80 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 text-left">
            <div className="flex size-10 items-center justify-center rounded bg-[#e5eeff] text-[#0051d5]">
              <Monitor className="size-5" />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
                Market Insights
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#43474c]">
                Benchmark launches against peer products and category trends.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 text-left">
            <div className="flex size-10 items-center justify-center rounded bg-[#e5eeff] text-[#F97316]">
              <Network className="size-5" />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
                Shipyard Ecosystem
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#43474c]">
                Connect launches to traffic, feedback, and product analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function MemberProductsPageContent() {
  const { products, total } = await getUserProducts({ limit: "1000" })
  const productRows = products as unknown as MemberProductRow[]

  if (total === 0) {
    return <EmptyProductsState />
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-[32px] font-bold leading-10 text-black">
            My Products
          </h1>
          <p className="text-[16px] leading-6 text-[#43474c]">
            Manage, monitor, and optimize your project portfolio.
          </p>
        </div>
        <ProductDraftStartButton
          mode="member"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-black/90 active:scale-95"
        >
          <Plus className="size-5" />
          Add new product
        </ProductDraftStartButton>
      </div>

      <ProductTable products={productRows} total={total} />
    </section>
  )
}

export function MemberProductsPageSkeleton() {
  return (
    <div className="w-full space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-10 w-52 rounded-lg" tone="soft" />
          <Skeleton className="h-5 w-96 max-w-full rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton
          size="lg"
          labelWidth="9rem"
          className="h-12 rounded-lg"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {[
                  "Product",
                  "Category",
                  "Plan",
                  "Domain",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-5 md:px-6">
                    <Skeleton className="h-3 w-20 rounded-full" tone="muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="px-5 py-6 md:px-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="size-12 rounded-lg" tone="muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36 rounded-full" />
                        <Skeleton
                          className="h-3 w-24 rounded-full"
                          tone="muted"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <Skeleton className="h-6 w-28 rounded-full" tone="soft" />
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <Skeleton className="h-4 w-20 rounded-full" tone="muted" />
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <Skeleton
                      className="mx-auto h-6 w-24 rounded"
                      tone="soft"
                    />
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <Skeleton className="h-6 w-20 rounded" tone="soft" />
                  </td>
                  <td className="px-5 py-6 md:px-6">
                    <div className="flex justify-end gap-2">
                      {Array.from({ length: 3 }).map((__, actionIndex) => (
                        <Skeleton
                          key={actionIndex}
                          className="size-9 rounded-lg"
                          tone="muted"
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 md:px-6">
          <Skeleton className="h-4 w-44 rounded-full" tone="muted" />
        </div>
      </div>
    </div>
  )
}
