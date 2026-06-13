"use client"

import { useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createProductDraft } from "@/actions/product-drafts/actions"
import {
  productDraftStepPath,
  type ProductDraftMode,
} from "@/lib/productWizard/draft"
import { cn } from "@/lib/utils"

type ProductDraftStartButtonProps = {
  mode: ProductDraftMode
  children: ReactNode
  className?: string
  "aria-label"?: string
  title?: string
}

export default function ProductDraftStartButton({
  mode,
  children,
  className,
  "aria-label": ariaLabel,
  title,
}: ProductDraftStartButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className={cn(className, isPending && "cursor-wait opacity-75")}
      aria-label={ariaLabel}
      title={title}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await createProductDraft(mode)
            if (result.draftId) {
              router.push(
                productDraftStepPath(mode, result.draftId, "configuration"),
              )
              return
            }
            toast.error(result.error || "Unable to start product draft")
          } catch {
            toast.error("Unable to start product draft")
          }
        })
      }}
    >
      {children}
    </button>
  )
}
