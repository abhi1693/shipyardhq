export type AdjustRewardsFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const initialAdjustRewardsState: AdjustRewardsFormState = {
  status: "idle",
}
