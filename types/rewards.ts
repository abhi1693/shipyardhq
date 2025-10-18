export interface RewardAnalyticsMetric {
  amount: number
  previousAmount: number
  delta: number
  count: number
  previousCount: number
}

export interface RewardAnalyticsAdjustmentMetric extends RewardAnalyticsMetric {
  net: number
  previousNet: number
  positiveAmount: number
  negativeAmount: number
  previousPositiveAmount: number
  previousNegativeAmount: number
}

export interface RewardAnalyticsNetMetric {
  amount: number
  previousAmount: number
  delta: number
}

export interface RewardAnalyticsTimelinePoint {
  date: string
  label: string
  earn: number
  spend: number
  adjustment: number
  refund: number
  net: number
}

export interface RewardAnalyticsLeaderboardEntry {
  id: string
  name: string
  amount: number
  share: number
  count: number
}

export interface RewardAnalyticsUserEntry
  extends RewardAnalyticsLeaderboardEntry {
  email?: string | null
}

export interface RewardAnalyticsSummary {
  rangeDays: number
  totals: {
    earned: RewardAnalyticsMetric
    spent: RewardAnalyticsMetric
    refunded: RewardAnalyticsMetric
    adjustments: RewardAnalyticsAdjustmentMetric
    netIssued: RewardAnalyticsNetMetric
  }
  timeline: RewardAnalyticsTimelinePoint[]
  leaders: {
    topRules: RewardAnalyticsLeaderboardEntry[]
    topRewards: RewardAnalyticsLeaderboardEntry[]
    topEarners: RewardAnalyticsUserEntry[]
    topSpenders: RewardAnalyticsUserEntry[]
  }
}
