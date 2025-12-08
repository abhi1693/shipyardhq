// Lightweight helpers to check plan features on a product/plan

type PlanWithFeatures = {
  assignments?:
    | { enabled: boolean; feature?: { key?: string | null } | null }[]
    | null
} | null

export function hasPlanFeature(plan: PlanWithFeatures, key: string): boolean {
  return !!plan?.assignments?.some((a) => a.enabled && a.feature?.key === key)
}
