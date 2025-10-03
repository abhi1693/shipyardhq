export type AdjustPointsFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const initialAdjustPointsState: AdjustPointsFormState = {
  status: "idle",
}
