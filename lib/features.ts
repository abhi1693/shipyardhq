// Lightweight helpers to check plan features on a product/plan

export type PlanWithFeatures = {
  assignments?:
    | { enabled: boolean; feature?: { key?: string | null } | null }[]
    | null
} | null

export function hasPlanFeature(plan: PlanWithFeatures, key: string): boolean {
  return !!plan?.assignments?.some((a) => a.enabled && a.feature?.key === key)
}

export function productHasFeature(
  product: { plan?: PlanWithFeatures } | null | undefined,
  key: string,
): boolean {
  return hasPlanFeature(product?.plan ?? null, key)
}
