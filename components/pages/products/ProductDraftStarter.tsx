"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { createProductDraft } from "@/actions/product-drafts/actions"
import {
  productDraftStepPath,
  type ProductDraftMode,
} from "@/lib/productWizard/draft"

export default function ProductDraftStarter({
  mode,
}: {
  mode: ProductDraftMode
}) {
  const router = useRouter()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    createProductDraft(mode)
      .then((result) => {
        if (result.draftId) {
          router.replace(
            productDraftStepPath(mode, result.draftId, "configuration"),
          )
          return
        }
        setError(result.error || "Unable to start product draft")
      })
      .catch(() => {
        setError("Unable to start product draft")
      })
  }, [mode, router])

  if (error) {
    return <div className="mt-12 text-center text-destructive">{error}</div>
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="rounded-xl border border-[#E2E8F0] bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#0051d5]" />
        <p className="text-sm font-semibold text-[#0b1c30]">
          Starting product draft
        </p>
      </div>
    </div>
  )
}
