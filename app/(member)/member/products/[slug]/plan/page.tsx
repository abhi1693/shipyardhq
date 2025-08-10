import { redirect, notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { setProductPlanAction, startPlanCheckoutAction } from "@/actions/member/products/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import { formatCurrency } from "@/lib/ui/formatters"
import { PricingFeature } from "@/components/molecules/PricingFeature"

export default async function ProductPlanPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) return notFound()

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { user: true, plan: true },
  })
  if (!product || product.user.clerkId !== userId) return notFound()

  const plans = await getPublicPlans()
  const currentPublic = product.plan
    ? plans.find((p) => p.id === product.plan!.id)
    : undefined
  const currentPrice = currentPublic ? currentPublic.price : 0
  const upgradablePlans = plans.filter((p) => p.price > currentPrice)

  async function assignPlan(formData: FormData) {
    "use server"
    const planIdRaw = formData.get("planId")?.toString() || ""
    const planId = planIdRaw.length ? planIdRaw : null
    if (!planId) redirect(`/member/products/${product.slug}`)
    const selected = plans.find((p) => p.id === planId)
    if (!selected || selected.price <= currentPrice) {
      // disallow downgrade or same-tier selection
      redirect(`/member/products/${product.slug}`)
    }
    if (selected && selected.externalId && selected.price > 0) {
      const session = await startPlanCheckoutAction(product.id, planId)
      if ((session as any)?.paymentLink) {
        redirect((session as any).paymentLink)
      }
      // If checkout fails, just bounce back to product page
      redirect(`/member/products/${product.slug}`)
    } else {
      await setProductPlanAction(product.id, planId)
      redirect(`/member/products/${product.slug}`)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Attach Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            {product.plan ? (
              <div>
                Current plan: <span className="text-foreground">{product.plan.name}</span>
              </div>
            ) : (
              <div>No plan selected.</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upgradablePlans.map((p) => (
              <form key={p.id} action={assignPlan} className="contents">
                <input type="hidden" name="planId" value={p.id} />
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold truncate">
                        {p.name}
                      </CardTitle>
                      {p.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col">
                      <div className="text-2xl font-bold">
                        {formatCurrency(p.price) as any}
                      </div>
                      {p.type === "one_time_price" ? (
                        <div className="text-[11px] inline-flex items-center rounded border px-1.5 py-0.5 w-fit mt-1 uppercase tracking-wide">One-time</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          per {p.frequency} {p.interval}
                          {p.frequency > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-sm text-foreground/90 leading-snug">
                        {p.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {p.features
                        .filter((f) => f.enabled)
                        .map((f) => (
                          <PricingFeature key={f.id} label={f.name} enabled={true} />
                        ))}
                    </ul>
                    <Button type="submit" className="w-full">
                      {p.type === "one_time_price" ? "Buy now" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            ))}
          </div>
          {upgradablePlans.length === 0 && (
            <div className="mt-6 text-sm text-muted-foreground">You’re already on the highest tier.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
