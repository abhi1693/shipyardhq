export type AdjustRewardsFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const initialAdjustRewardsState: AdjustRewardsFormState = {
  status: "idle",
}

export type RefundRewardsFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const initialRefundRewardsState: RefundRewardsFormState = {
  status: "idle",
}
