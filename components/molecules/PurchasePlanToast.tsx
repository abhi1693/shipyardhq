"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { BRAND_NAME } from "@/lib/brand"

// Displays toast messages based on query params and then cleans the URL.
export default function PurchasePlanToast() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const processedToastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!sp) return
    const error = sp.get("error")
    const upgraded = sp.get("upgraded")
    const toastKey = error ? `error:${error}` : upgraded ? "upgraded:1" : null

    if (!toastKey || processedToastKey.current === toastKey) return
    processedToastKey.current = toastKey

    let didShowToast = false
    if (error) {
      const msg =
        error === "plan_not_configured"
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
                      : error === "badge_not_found"
                        ? `We couldn't find the ${BRAND_NAME} badge on your product website. Add the generated badge embed, then publish again.`
                        : error === "publish_failed"
                          ? "Unable to publish your listing. Please try again."
                          : error === "must_publish"
                            ? "Publish your listing before boosting."
                            : "Something went wrong. Please try again."
      toast.error(msg, { id: `purchase-plan-${toastKey}` })
      didShowToast = true
    } else if (upgraded === "1") {
      toast.success("Plan applied to your product.", {
        id: `purchase-plan-${toastKey}`,
      })
      didShowToast = true
    }

    if (didShowToast) {
      // Clean only toast params so non-toast UI state, such as planId, survives.
      const nextParams = new URLSearchParams(sp.toString())
      nextParams.delete("error")
      nextParams.delete("upgraded")
      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    }
  }, [sp, router, pathname])

  return null
}
