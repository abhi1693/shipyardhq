"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export const BILLING_STATUS_POLL_INTERVAL_MS = 2000
export const BILLING_STATUS_MAX_ATTEMPTS = 45
export const BILLING_STATUS_REQUEST_TIMEOUT_MS = 10000
export const BILLING_STATUS_MAX_DURATION_MS = 90000
const BILLING_TOAST_ID = "purchase-plan-billing"

type BillingStatusResponse = {
  state?: "active" | "processing"
}

function purchaseErrorMessage(error: string) {
  return error === "plan_not_configured"
    ? "This plan isn't configured for checkout yet. Please contact support."
    : error === "checkout_init_failed"
      ? "Unable to start checkout. Please try again."
      : error === "plan_already_paid"
        ? "This product already has a paid plan. Manage billing instead."
        : error === "subscription_payment_pending"
          ? "Finish your previous subscription payment before changing plans."
          : error === "subscription_change_failed"
            ? "Unable to change your subscription plan right now."
            : error === "subscription_portal_failed"
              ? "Unable to open the billing portal. Please try again."
              : error === "plan_type_locked"
                ? "You can't switch between subscription and one-time while a paid plan is active."
                : error === "publish_failed"
                  ? "Unable to publish your listing. Please try again."
                  : error === "must_publish"
                    ? "Publish your listing before boosting."
                    : "Something went wrong. Please try again."
}

function cleanedUrl(pathname: string, search: string, keys: readonly string[]) {
  const nextParams = new URLSearchParams(search)
  keys.forEach((key) => nextParams.delete(key))
  const nextQuery = nextParams.toString()
  return nextQuery ? `${pathname}?${nextQuery}` : pathname
}

// Displays checkout feedback, polls delayed grant fulfillment, then cleans the
// URL while preserving unrelated UI state such as planId or celebrate.
export default function PurchasePlanToast() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const search = sp?.toString() ?? ""
  const params = new URLSearchParams(search)
  const error = params.get("error")
  const upgraded = params.get("upgraded")
  const billing = params.get("billing")
  const billingToken = params.get("billingToken")?.trim() ?? ""
  const billingProductId = params.get("billingProductId")?.trim() ?? ""
  const billingPlanId = params.get("billingPlanId")?.trim() ?? ""
  const processedToastKey = useRef<string | null>(null)
  const shownBillingKey = useRef<string | null>(null)
  const completedBillingKey = useRef<string | null>(null)

  useEffect(() => {
    const toastKey = error ? `error:${error}` : upgraded ? "upgraded:1" : null
    if (!toastKey) {
      processedToastKey.current = null
      return
    }
    if (processedToastKey.current === toastKey) return
    processedToastKey.current = toastKey

    if (error) {
      toast.error(purchaseErrorMessage(error), {
        id: `purchase-plan-${toastKey}`,
      })
    } else {
      toast.success("Plan applied to your product.", {
        id: `purchase-plan-${toastKey}`,
      })
    }

    router.replace(cleanedUrl(pathname, search, ["error", "upgraded"]))
  }, [error, pathname, router, search, upgraded])

  useEffect(() => {
    if (
      error ||
      upgraded ||
      (billing !== "success" && billing !== "processing")
    ) {
      if (!billing) {
        shownBillingKey.current = null
        completedBillingKey.current = null
      }
      return
    }

    const billingKey = [
      billingToken || search,
      billing,
      billingProductId,
      billingPlanId,
    ].join(":")
    const cleanBillingUrl = () => {
      router.replace(
        cleanedUrl(pathname, search, [
          "billing",
          "billingToken",
          "billingProductId",
          "billingPlanId",
        ]),
      )
    }

    if (shownBillingKey.current !== billingKey) {
      shownBillingKey.current = billingKey
      toast.loading(
        billing === "success"
          ? "Confirming your active plan…"
          : "Payment received. Applying your plan…",
        {
          id: BILLING_TOAST_ID,
          duration: Infinity,
        },
      )
    }

    if (!billingProductId || !billingPlanId) {
      if (completedBillingKey.current === billingKey) return
      completedBillingKey.current = billingKey
      if (billing === "success") {
        toast.error(
          "We couldn't verify this plan automatically. Please contact support if it does not appear.",
          { id: BILLING_TOAST_ID, duration: 10000 },
        )
      } else {
        toast.info(
          "Payment received and is still being reconciled. Your plan will appear once confirmation completes.",
          { id: BILLING_TOAST_ID, duration: 10000 },
        )
      }
      cleanBillingUrl()
      return
    }

    let cancelled = false
    let attempts = 0
    let pollingStartedAt = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let activeController: AbortController | null = null

    const schedule = (delayMs: number) => {
      if (cancelled) return
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timeoutId = null
        void poll()
      }, delayMs)
    }

    const showStillProcessing = () => {
      toast.info(
        "Activation is taking longer than expected. Your payment is still being reconciled.",
        {
          id: BILLING_TOAST_ID,
          duration: Infinity,
          action: {
            label: "Check again",
            onClick: () => {
              if (cancelled) return
              attempts = 0
              pollingStartedAt = Date.now()
              toast.loading("Checking your plan again…", {
                id: BILLING_TOAST_ID,
                duration: Infinity,
              })
              schedule(0)
            },
          },
        },
      )
    }

    const stopWithError = (message: string) => {
      if (completedBillingKey.current === billingKey) return
      completedBillingKey.current = billingKey
      toast.error(message, { id: BILLING_TOAST_ID, duration: 10000 })
      cleanBillingUrl()
    }

    const complete = () => {
      if (completedBillingKey.current === billingKey) return
      completedBillingKey.current = billingKey
      toast.success("Your plan is active.", {
        id: BILLING_TOAST_ID,
      })
      cleanBillingUrl()
      router.refresh()
    }

    async function poll() {
      if (cancelled) return
      const elapsedMs = Date.now() - pollingStartedAt
      if (elapsedMs >= BILLING_STATUS_MAX_DURATION_MS) {
        showStillProcessing()
        return
      }
      if (document.visibilityState === "hidden") {
        schedule(
          Math.min(
            BILLING_STATUS_POLL_INTERVAL_MS,
            BILLING_STATUS_MAX_DURATION_MS - elapsedMs,
          ),
        )
        return
      }

      attempts += 1
      const controller = new AbortController()
      activeController = controller
      let requestTimeoutId: ReturnType<typeof setTimeout> | null = null
      let requestTimedOut = false
      const statusParams = new URLSearchParams({
        productId: billingProductId,
        planId: billingPlanId,
      })

      try {
        const remainingMs = Math.max(
          1,
          BILLING_STATUS_MAX_DURATION_MS - (Date.now() - pollingStartedAt),
        )
        const response = await Promise.race([
          fetch(`/api/billing/plan-grants/status?${statusParams.toString()}`, {
            cache: "no-store",
            credentials: "same-origin",
            headers: { accept: "application/json" },
            signal: controller.signal,
          }),
          new Promise<never>((_resolve, reject) => {
            requestTimeoutId = setTimeout(
              () => {
                requestTimedOut = true
                controller.abort()
                reject(new Error("Billing status request timed out"))
              },
              Math.min(BILLING_STATUS_REQUEST_TIMEOUT_MS, remainingMs),
            )
          }),
        ])
        if (cancelled) return

        if (response.status === 401 || response.status === 403) {
          stopWithError(
            "Your session expired. Sign in again to confirm the plan.",
          )
          return
        }
        if (response.status === 400 || response.status === 404) {
          stopWithError(
            "We couldn't confirm this purchase automatically. Please contact support if the plan does not appear.",
          )
          return
        }

        const payload = response.ok
          ? ((await response.json()) as BillingStatusResponse)
          : null
        if (cancelled) return
        if (payload?.state === "active") {
          complete()
          return
        }
      } catch (fetchError) {
        if (cancelled || (controller.signal.aborted && !requestTimedOut)) return
        if (!requestTimedOut) {
          console.warn("[billing-status] polling failed", fetchError)
        }
      } finally {
        if (requestTimeoutId) clearTimeout(requestTimeoutId)
        if (activeController === controller) activeController = null
      }

      if (cancelled) return
      const totalElapsedMs = Date.now() - pollingStartedAt
      if (
        attempts >= BILLING_STATUS_MAX_ATTEMPTS ||
        totalElapsedMs >= BILLING_STATUS_MAX_DURATION_MS
      ) {
        showStillProcessing()
        return
      }
      schedule(
        Math.min(
          BILLING_STATUS_POLL_INTERVAL_MS,
          BILLING_STATUS_MAX_DURATION_MS - totalElapsedMs,
        ),
      )
    }

    // A zero-delay timer lets React StrictMode clean up its probe effect before
    // the first request, leaving exactly one live polling loop.
    schedule(0)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      activeController?.abort()
    }
  }, [
    billing,
    billingPlanId,
    billingProductId,
    billingToken,
    error,
    pathname,
    router,
    search,
    upgraded,
  ])

  return null
}
