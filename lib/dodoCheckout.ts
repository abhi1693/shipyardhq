"use client"

import { IS_PROD } from "@/lib/constants"

// Importing directly is fine in client-only modules
import { DodoPayments } from "dodopayments-checkout"

type CheckoutProduct = {
  productId: string
}

type InitOptions = {
  mode?: "test" | "live"
  // displayType is intentionally not configurable; always overlay
  theme?: "light" | "dark"
  onEvent?: (event: any) => void
}

export function initDodoCheckout(options: InitOptions = {}) {
  DodoPayments.Initialize({
    mode: options.mode ?? (IS_PROD ? "live" : "test"),
    displayType: "overlay",
    linkType: "static",
    theme: options.theme ?? "dark",
    onEvent: options.onEvent,
  })
}

export async function openDodoCheckout(args: {
  products: CheckoutProduct[]
  redirectUrl?: string
  queryParams?: Record<string, string>
  email?: string
  name?: string
}) {
  const payload: any = {
    products: args.products.map((p) => ({
      productId: p.productId,
      quantity: 1,
    })),
    redirectUrl: args.redirectUrl,
  }

  if (
    (args.email && args.email.trim().length > 0) ||
    (args.name && args.name.trim().length > 0)
  ) {
    payload.queryParams = {
      ...(args.queryParams || {}),
      ...(args.email ? { email: args.email, disableEmail: "true" } : {}),
      ...(args.name ? { fullName: args.name } : {}),
    }
  } else if (args.queryParams) {
    payload.queryParams = args.queryParams
  }

  DodoPayments.Checkout.open(payload)
}
