import Link from "next/link"
import { redirect } from "next/navigation"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { PlanType } from "@/lib/vendor/prisma/client"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { memberProductPath, memberProductsStatusPath } from "@/lib/routes"
import { ProductUpgradePricingTable } from "@/components/organisms/ProductUpgradePricingTable"
import { Badge } from "@/components/atoms/badge"

export default async function ProductUpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!slug) {
    redirect(memberProductsStatusPath("invalid"))
  }

  const { product } = await requireManageableProduct(slug, {
    missingRedirect: memberProductsStatusPath("not-found"),
    unauthorizedRedirect: memberProductsStatusPath("unauthorized"),
  })

  const allPlans = await getPublicPlans({
    type: PlanType.one_time_price,
  }).catch(() => [])
  const paidPlans = allPlans.filter((plan) => (plan.price || 0) > 0)

  const productHref = memberProductPath(product.slug)
  const celebrateHref = `${productHref}?celebrate=1`

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 text-center">
        <Badge
          variant="outline"
          className="mx-auto w-fit rounded-full border border-foreground/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-foreground/70"
        >
          Step 2
        </Badge>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Give {product.name} a launch boost
        </h1>
      </div>

      <div className="mt-10">
        {paidPlans.length ? (
          <ProductUpgradePricingTable
            plans={paidPlans}
            productId={product.id}
            redirectPath={productHref}
            className="mx-auto w-full max-w-5xl"
          />
        ) : (
          <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-[color:var(--brand-1)/0.15] bg-white/80 px-6 py-10 text-center text-muted-foreground">
            Paid plans are not available yet. You can continue to your product page
            and manage upgrades later.
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href={celebrateHref}
          className="text-foreground underline-offset-4 transition hover:text-foreground/80 hover:underline"
        >
          Continue with free plan
        </Link>
      </div>

    </div>
  )
}
