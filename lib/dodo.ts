import DodoPayments from "dodopayments"

const rawEnv = process.env.DODO_ENV?.trim()
if (!rawEnv) {
  throw new Error("DODO_ENV environment variable is required")
}

if (rawEnv !== "live_mode" && rawEnv !== "test_mode") {
  throw new Error("DODO_ENV must be set to 'live_mode' or 'test_mode'")
}

const token = process.env.DODO_API_KEY?.trim()
if (!token) {
  throw new Error("DODO_API_KEY environment variable is required")
}

export const dodoClient = new DodoPayments({
  bearerToken: token,
  environment: rawEnv as "live_mode" | "test_mode",
})
