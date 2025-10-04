export class RewardsError extends Error {
  public readonly code: string

  constructor(message: string, code: string = "REWARDS_ERROR") {
    super(message)
    this.code = code
    this.name = this.constructor.name
  }
}

export class RewardRuleNotFoundError extends RewardsError {
  constructor(public readonly ruleKey: string) {
    super(`Reward rule '${ruleKey}' was not found`, "RULE_NOT_FOUND")
  }
}

export class RewardRuleInactiveError extends RewardsError {
  constructor(public readonly ruleKey: string) {
    super(`Reward rule '${ruleKey}' is not active`, "RULE_INACTIVE")
  }
}

export class RewardsCapExceededError extends RewardsError {
  constructor(
    public readonly ruleKey: string,
    public readonly scope: "daily" | "lifetime" | "target",
  ) {
    super(
      `Reward cap exceeded for '${ruleKey}' at ${scope} scope`,
      "CAP_EXCEEDED",
    )
  }
}

export class RewardsCooldownError extends RewardsError {
  constructor(
    public readonly ruleKey: string,
    public readonly scope: "global" | "target",
  ) {
    super(`Cooldown active for '${ruleKey}' (${scope})`, "COOLDOWN_ACTIVE")
  }
}

export class RewardsInsufficientBalanceError extends RewardsError {
  constructor(
    public readonly userId: string,
    public readonly required: number,
  ) {
    super(
      `User '${userId}' does not have enough rewards`,
      "INSUFFICIENT_BALANCE",
    )
  }
}

export class RewardUnavailableError extends RewardsError {
  constructor(public readonly featureKey: string) {
    super(`Reward '${featureKey}' is not available`, "REWARD_UNAVAILABLE")
  }
}

export class RedemptionLimitError extends RewardsError {
  constructor(
    public readonly featureKey: string,
    public readonly scope: "active" | "pending",
  ) {
    super(
      `Redemption limit reached for '${featureKey}' (${scope})`,
      "LIMIT_REACHED",
    )
  }
}

export class RedemptionValidationError extends RewardsError {
  constructor(
    message: string,
    public readonly featureKey: string,
  ) {
    super(message, "REDEMPTION_INVALID")
  }
}

export class RedemptionNotFoundError extends RewardsError {
  constructor(public readonly redemptionId: string) {
    super(`Redemption '${redemptionId}' was not found`, "REDEMPTION_NOT_FOUND")
  }
}

export class RedemptionRefundError extends RewardsError {
  constructor(message: string, public readonly redemptionId: string) {
    super(message, "REDEMPTION_REFUND_INVALID")
  }
}
