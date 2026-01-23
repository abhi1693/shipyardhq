// Utility to determine the correct assignment timestamp when swapping plans.
// Ensures any remaining boost time from the previous plan is layered onto the new one.
const DAY_IN_MS = 24 * 60 * 60 * 1000

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
  currentPlan,
  currentAssignedAt,
  newPlan,
  now = new Date(),
}: ResolveArgs): Date | null {
  const newBoostDays = newPlan.boostForDays ?? 0
  if (newPlan.isDefault || newBoostDays <= 0) {
    return null
  }

  let remainingMs = 0

  if (
    currentAssignedAt &&
    currentPlan &&
    !currentPlan.isDefault &&
    (currentPlan.boostForDays ?? 0) > 0
  ) {
    const elapsedMs = Math.max(0, now.getTime() - currentAssignedAt.getTime())
    const previousBoostMs = (currentPlan.boostForDays ?? 0) * DAY_IN_MS
    remainingMs = Math.max(0, previousBoostMs - elapsedMs)
  }

  if (remainingMs <= 0) {
    return now
  }

  return new Date(now.getTime() + remainingMs)
}
