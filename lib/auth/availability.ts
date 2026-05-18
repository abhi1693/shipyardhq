const disabledOverride = process.env.NEXT_PUBLIC_AUTH_DISABLED
  ?.trim()
  .toLowerCase()

const authEnabledValues = new Set(["0", "false", "no", "off"])

export const AUTH_TEMPORARILY_DISABLED = !authEnabledValues.has(
  disabledOverride ?? "true",
)

export const AUTH_DISABLED_TITLE = "Accounts are temporarily unavailable"

export const AUTH_DISABLED_MESSAGE =
  "Login and account creation are paused for now. Public pages remain available."

export const AUTH_DISABLED_SHORT_LABEL = "Accounts paused"
