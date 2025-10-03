export class PointsError extends Error {
  public readonly code: string

  constructor(message: string, code: string = "POINTS_ERROR") {
    super(message)
    this.code = code
    this.name = this.constructor.name
  }
}

export class RewardRuleNotFoundError extends PointsError {
  constructor(public readonly ruleKey: string) {
    super(`Reward rule '${ruleKey}' was not found`, "RULE_NOT_FOUND")
  }
}

export class RewardRuleInactiveError extends PointsError {
  constructor(public readonly ruleKey: string) {
    super(`Reward rule '${ruleKey}' is not active`, "RULE_INACTIVE")
  }
}

export class PointsCapExceededError extends PointsError {
  constructor(
    public readonly ruleKey: string,
    public readonly scope: "daily" | "lifetime" | "target",
  ) {
    super(
      `Point cap exceeded for '${ruleKey}' at ${scope} scope`,
      "CAP_EXCEEDED",
    )
  }
}

export class PointsCooldownError extends PointsError {
  constructor(
    public readonly ruleKey: string,
    public readonly scope: "global" | "target",
  ) {
    super(`Cooldown active for '${ruleKey}' (${scope})`, "COOLDOWN_ACTIVE")
  }
}

export class PointsInsufficientBalanceError extends PointsError {
  constructor(public readonly userId: string, public readonly required: number) {
    super(`User '${userId}' does not have enough points`, "INSUFFICIENT_BALANCE")
  }
}

export class RewardUnavailableError extends PointsError {
  constructor(public readonly featureKey: string) {
    super(`Reward '${featureKey}' is not available`, "REWARD_UNAVAILABLE")
  }
}

export class RedemptionLimitError extends PointsError {
  constructor(
    public readonly featureKey: string,
    public readonly scope: "active" | "pending",
  ) {
    super(`Redemption limit reached for '${featureKey}' (${scope})`, "LIMIT_REACHED")
  }
}

export class RedemptionValidationError extends PointsError {
  constructor(message: string, public readonly featureKey: string) {
    super(message, "REDEMPTION_INVALID")
  }
}
