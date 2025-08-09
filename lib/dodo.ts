import DodoPayments from "dodopayments"
import { IS_PROD } from "@/lib/constants"

export const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY,
  environment: IS_PROD ? "live_mode" : "test_mode",
})
