type PlanLike = {
  boostForDays: number | null
  isDefault: boolean
}

type ResolveArgs = {
  currentPlan?: PlanLike | null
  currentAssignedAt?: Date | null
  newPlan: PlanLike
  now?: Date
}

export function resolvePlanAssignedAt({
  newPlan,
  now = new Date(),
}: ResolveArgs): Date | null {
  const newBoostDays = newPlan.boostForDays ?? 0
  if (newPlan.isDefault || newBoostDays <= 0) {
    return null
  }

  // Remaining paid time is represented by ProductPlanGrant rows. Never encode
  // carry-forward as a future assignment timestamp.
  return now
}
