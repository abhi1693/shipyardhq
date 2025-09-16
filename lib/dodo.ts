import DodoPayments from "dodopayments"
import { IS_PROD } from "@/lib/constants"

// Allow explicit control of Dodo environment to avoid accidental live calls
// when NODE_ENV=production but you only have a test key. Set DODO_ENV to
// "live"/"live_mode" or "test"/"test_mode". Defaults to IS_PROD.
const DODO_ENV_RAW = (
  process.env.DODO_ENV || (IS_PROD ? "live" : "test")
).toLowerCase()
const DODO_ENV = DODO_ENV_RAW.startsWith("live") ? "live_mode" : "test_mode"

function createDodoClient() {
  const token = process.env.DODO_API_KEY?.trim()
  if (token) {
    return new DodoPayments({
      bearerToken: token,
      environment: DODO_ENV,
    })
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "DODO_API_KEY is not configured; using a no-op Dodo client for local/test environments.",
    )
    const noop = {
      customers: {
        customerPortal: {
          async create() {
            return { link: null }
          },
        },
      },
    }
    return noop as unknown as DodoPayments
  }

  throw new Error("DODO_API_KEY environment variable is required")
}

export const dodoClient = createDodoClient()
