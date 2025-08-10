import { redirect, notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { setProductPlanAction } from "@/actions/member/products/actions"
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

  async function assignPlan(formData: FormData) {
    "use server"
    const planIdRaw = formData.get("planId")?.toString() || ""
    const planId = planIdRaw.length ? planIdRaw : null
    const res = await setProductPlanAction(product.id, planId)
    if ((res as any)?.error) {
      // Fallback: redirect with no changes; surface error via URL if needed later
      redirect(`/member/products/${product.slug}`)
    }
    redirect(`/member/products/${product.slug}`)
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
            {plans.map((p) => (
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
                      {p.price > 0 && (
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
                    <Button type="submit" className="w-full" variant={
                      product.plan?.id === p.id ? "secondary" : "default"
                    }>
                      {product.plan?.id === p.id ? "Selected" : "Choose plan"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            {product.plan && (
              <form action={assignPlan}>
                <input type="hidden" name="planId" value="" />
                <Button type="submit" variant="outline">Remove plan</Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
