import { StrictMode, act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const toastMocks = vi.hoisted(() => ({
  pathname: "/member/products/shipyard",
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  refresh: vi.fn(),
  loading: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => toastMocks.pathname,
  useRouter: () => ({
    replace: toastMocks.replace,
    refresh: toastMocks.refresh,
  }),
  useSearchParams: () => toastMocks.searchParams,
}))

vi.mock("sonner", () => ({
  toast: {
    loading: toastMocks.loading,
    success: toastMocks.success,
    error: toastMocks.error,
    info: toastMocks.info,
  },
}))

import PurchasePlanToast, {
  BILLING_STATUS_MAX_ATTEMPTS,
  BILLING_STATUS_REQUEST_TIMEOUT_MS,
} from "@/components/molecules/PurchasePlanToast"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function statusResponse(state: "active" | "processing") {
  return new Response(JSON.stringify({ state }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

describe("PurchasePlanToast billing return journey", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    toastMocks.pathname = "/member/products/shipyard"
    toastMocks.searchParams = new URLSearchParams()
    vi.stubGlobal("fetch", toastMocks.fetch)
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount())
    }
    container?.remove()
    root = null
    container = null
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function renderToast(search: string) {
    toastMocks.searchParams = new URLSearchParams(search)
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await rerenderToast(search)
  }

  async function rerenderToast(search: string) {
    toastMocks.searchParams = new URLSearchParams(search)

    await act(async () => {
      root?.render(
        <StrictMode>
          <PurchasePlanToast />
        </StrictMode>,
      )
    })
  }

  it("consumes direct billing success once and preserves unrelated query state", async () => {
    toastMocks.fetch.mockResolvedValueOnce(statusResponse("active"))
    await renderToast(
      "billing=success&billingToken=attempt_1&billingProductId=product_1&billingPlanId=plan_pro&planId=keep&celebrate=1",
    )
    expect(toastMocks.loading).toHaveBeenCalledWith(
      "Confirming your active plan…",
      { id: "purchase-plan-billing", duration: Infinity },
    )
    expect(toastMocks.success).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersToNextTimerAsync())

    expect(toastMocks.success).toHaveBeenCalledTimes(1)
    expect(toastMocks.success).toHaveBeenCalledWith("Your plan is active.", {
      id: "purchase-plan-billing",
    })
    expect(toastMocks.replace).toHaveBeenCalledWith(
      "/member/products/shipyard?planId=keep&celebrate=1",
    )
    expect(toastMocks.refresh).not.toHaveBeenCalled()
    expect(toastMocks.fetch).toHaveBeenCalledTimes(1)
  })

  it("does not trust a forged success query without owned plan correlation", async () => {
    await renderToast("billing=success&billingToken=forged")

    expect(toastMocks.success).not.toHaveBeenCalled()
    expect(toastMocks.fetch).not.toHaveBeenCalled()
    expect(toastMocks.error).toHaveBeenCalledWith(
      "We couldn't verify this plan automatically. Please contact support if it does not appear.",
      { id: "purchase-plan-billing", duration: 10000 },
    )
    expect(toastMocks.replace).toHaveBeenCalledWith("/member/products/shipyard")
  })

  it("handles distinct returns and repeated errors in one persistent member layout", async () => {
    toastMocks.fetch.mockImplementation(() =>
      Promise.resolve(statusResponse("active")),
    )
    await renderToast(
      "billing=success&billingToken=attempt_first&billingProductId=product_1&billingPlanId=plan_pro",
    )
    await act(async () => vi.advanceTimersToNextTimerAsync())
    await rerenderToast("")
    await rerenderToast(
      "billing=success&billingToken=attempt_second&billingProductId=product_1&billingPlanId=plan_pro",
    )
    await act(async () => vi.advanceTimersToNextTimerAsync())

    expect(toastMocks.success).toHaveBeenCalledTimes(2)
    expect(toastMocks.refresh).not.toHaveBeenCalled()

    await rerenderToast("")
    await rerenderToast("error=checkout_init_failed")
    await rerenderToast("")
    await rerenderToast("error=checkout_init_failed")

    expect(toastMocks.error).toHaveBeenCalledTimes(2)
    expect(toastMocks.replace).toHaveBeenLastCalledWith(
      "/member/products/shipyard",
    )
  })

  it("polls sequentially and uses one route replacement on success", async () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    toastMocks.fetch
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(statusResponse("processing"))
      .mockResolvedValueOnce(statusResponse("active"))

    await renderToast(
      "billing=processing&billingToken=attempt_2&billingProductId=product_1&billingPlanId=plan_pro&planId=keep",
    )

    expect(toastMocks.loading).toHaveBeenCalledTimes(1)
    expect(toastMocks.loading).toHaveBeenCalledWith(
      "Payment received. Applying your plan…",
      { id: "purchase-plan-billing", duration: Infinity },
    )

    await act(async () => vi.advanceTimersToNextTimerAsync())
    await act(async () => vi.advanceTimersToNextTimerAsync())
    await act(async () => vi.advanceTimersToNextTimerAsync())

    expect(toastMocks.fetch).toHaveBeenCalledTimes(3)
    expect(toastMocks.fetch).toHaveBeenLastCalledWith(
      "/api/billing/plan-grants/status?productId=product_1&planId=plan_pro",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        signal: expect.any(AbortSignal),
      }),
    )
    expect(toastMocks.success).toHaveBeenCalledTimes(1)
    expect(toastMocks.replace).toHaveBeenCalledWith(
      "/member/products/shipyard?planId=keep",
    )
    expect(toastMocks.refresh).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(30000))
    expect(toastMocks.fetch).toHaveBeenCalledTimes(3)
    warning.mockRestore()
  })

  it("never overlaps polls and aborts an in-flight request on unmount", async () => {
    let requestSignal: AbortSignal | undefined
    toastMocks.fetch.mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal ?? undefined
        return new Promise<Response>(() => undefined)
      },
    )

    await renderToast(
      "billing=processing&billingToken=attempt_3&billingProductId=product_1&billingPlanId=plan_pro",
    )
    await act(async () => vi.advanceTimersToNextTimerAsync())
    await act(async () =>
      vi.advanceTimersByTimeAsync(BILLING_STATUS_REQUEST_TIMEOUT_MS - 1),
    )

    expect(toastMocks.fetch).toHaveBeenCalledTimes(1)
    expect(requestSignal?.aborted).toBe(false)

    await act(async () => root?.unmount())
    root = null
    expect(requestSignal?.aborted).toBe(true)
    expect(toastMocks.success).not.toHaveBeenCalled()
  })

  it("aborts hung requests and reaches wall-clock timeout feedback", async () => {
    const requestSignals: AbortSignal[] = []
    toastMocks.fetch.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.signal) requestSignals.push(init.signal)
        return new Promise<Response>(() => undefined)
      },
    )

    await renderToast(
      "billing=processing&billingToken=attempt_hung&billingProductId=product_1&billingPlanId=plan_pro",
    )
    await act(async () => vi.runAllTimersAsync())

    expect(toastMocks.fetch.mock.calls.length).toBeGreaterThan(1)
    expect(requestSignals.every((signal) => signal.aborted)).toBe(true)
    expect(toastMocks.info).toHaveBeenCalledWith(
      "Activation is taking longer than expected. Your payment is still being reconciled.",
      expect.objectContaining({ id: "purchase-plan-billing" }),
    )
  })

  it("stops bounded polling with honest delayed-activation feedback", async () => {
    toastMocks.fetch.mockImplementation(() =>
      Promise.resolve(statusResponse("processing")),
    )

    await renderToast(
      "billing=processing&billingToken=attempt_4&billingProductId=product_1&billingPlanId=plan_pro",
    )
    await act(async () => vi.runAllTimersAsync())

    expect(toastMocks.fetch).toHaveBeenCalledTimes(BILLING_STATUS_MAX_ATTEMPTS)
    expect(toastMocks.info).toHaveBeenCalledWith(
      "Activation is taking longer than expected. Your payment is still being reconciled.",
      expect.objectContaining({
        id: "purchase-plan-billing",
        duration: Infinity,
        action: expect.objectContaining({ label: "Check again" }),
      }),
    )
    expect(toastMocks.refresh).not.toHaveBeenCalled()
    expect(toastMocks.replace).not.toHaveBeenCalled()

    const timeoutOptions = toastMocks.info.mock.calls.at(-1)?.[1] as
      { action?: { onClick?: () => void } } | undefined
    toastMocks.fetch.mockImplementation(() =>
      Promise.resolve(statusResponse("active")),
    )
    await act(async () => timeoutOptions?.action?.onClick?.())
    await act(async () => vi.advanceTimersToNextTimerAsync())

    expect(toastMocks.success).toHaveBeenCalledTimes(1)
    expect(toastMocks.refresh).not.toHaveBeenCalled()
  })
})
