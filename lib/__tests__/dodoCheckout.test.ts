import { describe, expect, it, vi } from "vitest"

async function loadCheckoutModule(isProd: boolean) {
  vi.resetModules()

  const initializeMock = vi.fn()
  const openMock = vi.fn()

  vi.doMock("dodopayments-checkout", () => ({
    DodoPayments: {
      Initialize: initializeMock,
      Checkout: { open: openMock },
    },
  }))

  vi.doMock("@/lib/constants", () => ({ IS_PROD: isProd }))

  const mod = await import("@/lib/dodoCheckout")

  return {
    initializeMock,
    openMock,
    ...mod,
  }
}

describe("dodoCheckout", () => {
  it("initializes checkout with production defaults", async () => {
    const { initDodoCheckout, initializeMock } = await loadCheckoutModule(true)

    initDodoCheckout()

    expect(initializeMock).toHaveBeenCalledWith({
      mode: "live",
      displayType: "overlay",
      linkType: "static",
      theme: "dark",
      onEvent: undefined,
    })
  })

  it("allows overriding mode, theme, and event handler", async () => {
    const { initDodoCheckout, initializeMock } = await loadCheckoutModule(false)
    const handler = vi.fn()

    initDodoCheckout({ mode: "test", theme: "light", onEvent: handler })

    expect(initializeMock).toHaveBeenCalledWith({
      mode: "test",
      displayType: "overlay",
      linkType: "static",
      theme: "light",
      onEvent: handler,
    })
  })

  it("opens checkout with normalized payload and merged query params", async () => {
    const { openDodoCheckout, openMock } = await loadCheckoutModule(false)

    await openDodoCheckout({
      products: [{ productId: "prod_123" }],
      redirectUrl: "https://app.shipyardhq.dev/success",
      queryParams: { plan: "pro" },
      email: "user@example.com",
      name: "Ada Lovelace",
    })

    expect(openMock).toHaveBeenCalledWith({
      products: [{ productId: "prod_123", quantity: 1 }],
      redirectUrl: "https://app.shipyardhq.dev/success",
      queryParams: {
        plan: "pro",
        email: "user@example.com",
        disableEmail: "true",
        fullName: "Ada Lovelace",
      },
    })
  })

  it("passes through query params when contact info missing", async () => {
    const { openDodoCheckout, openMock } = await loadCheckoutModule(false)

    await openDodoCheckout({
      products: [{ productId: "prod_456" }],
      queryParams: { ref: "campaign" },
    })

    expect(openMock).toHaveBeenCalledWith({
      products: [{ productId: "prod_456", quantity: 1 }],
      redirectUrl: undefined,
      queryParams: { ref: "campaign" },
    })
  })
})
