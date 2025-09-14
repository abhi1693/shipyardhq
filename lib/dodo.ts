import DodoPayments from "dodopayments"
import { IS_PROD } from "@/lib/constants"

// Allow explicit control of Dodo environment to avoid accidental live calls
// when NODE_ENV=production but you only have a test key. Set DODO_ENV to
// "live"/"live_mode" or "test"/"test_mode". Defaults to IS_PROD.
const DODO_ENV_RAW = (
  process.env.DODO_ENV || (IS_PROD ? "live" : "test")
).toLowerCase()
const DODO_ENV = DODO_ENV_RAW.startsWith("live") ? "live_mode" : "test_mode"

export const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY,
  environment: DODO_ENV,
})
