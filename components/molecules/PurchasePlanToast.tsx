"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

// Displays toast messages based on query params and then cleans the URL.
export default function PurchasePlanToast() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() ?? "/"

  useEffect(() => {
    if (!sp) return
    const error = sp.get("error")
    const upgraded = sp.get("upgraded")

    let didNotify = false
    if (error) {
      const msg =
        error === "plan_not_configured"
          ? "This plan isn't configured for checkout yet. Please contact support."
          : error === "checkout_init_failed"
            ? "Unable to start checkout. Please try again."
            : error === "subscription_payment_pending"
              ? "Finish your previous subscription payment before changing plans."
              : error === "subscription_change_failed"
                ? "Unable to change your subscription plan right now."
              : error === "publish_failed"
                ? "Unable to publish your listing. Please try again."
              : error === "must_publish"
                ? "Publish your listing before boosting."
                : "Something went wrong. Please try again."
      toast.error(msg)
      didNotify = true
    } else if (upgraded === "1") {
      toast.success("Plan applied to your product.")
      didNotify = true
    }

    if (didNotify) {
      // Clean the query string to avoid repeat toasts on refresh
      router.replace(pathname)
    }
  }, [sp, router, pathname])

  return null
}
