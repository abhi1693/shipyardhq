"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { useFormStatus } from "react-dom"
import { Star, XCircle } from "lucide-react"

import { Textarea } from "@/components/atoms/textarea"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { type SubmitReviewState } from "@/actions/public/products/reviews"

const ratingOptions = [1, 2, 3, 4, 5]

const initialState: SubmitReviewState = { status: "idle" }

interface ProductReviewFormProps {
  productId: string
  action: (
    state: SubmitReviewState,
    formData: FormData,
  ) => Promise<SubmitReviewState>
  initialRating?: number | null
  initialMessage?: string | null
}

export default function ProductReviewForm({
  productId,
  action,
  initialRating,
  initialMessage,
}: ProductReviewFormProps) {
  const router = useRouter()
  const timeoutRef = useRef<number | null>(null)
  const normalizedInitialRating =
    typeof initialRating === "number" && initialRating >= 0 ? initialRating : 0
  const [rating, setRating] = useState<number>(normalizedInitialRating)
  const [message, setMessage] = useState(initialMessage ?? "")
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [state, formAction] = useActionState(
    async (previousState: SubmitReviewState, formData: FormData) => {
      const result = await action(previousState, formData)

      if (result.status === "success") {
        setShowSuccess(true)
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = window.setTimeout(() => {
          setShowSuccess(false)
          timeoutRef.current = null
        }, 4000)
        router.refresh()
      } else if (result.status === "error") {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setShowSuccess(false)
      }

      return result
    },
    initialState,
  )

  useEffect(() => {
    if (
      typeof initialRating === "number" &&
      initialRating >= 0 &&
      initialRating <= 5
    ) {
      startTransition(() => {
        setRating(initialRating)
      })
      return
    }

    if (initialRating == null) {
      startTransition(() => {
        setRating(0)
      })
    }
  }, [initialRating])

  useEffect(() => {
    if (typeof initialMessage === "string") {
      startTransition(() => {
        setMessage(initialMessage)
      })
    } else if (initialMessage == null) {
      startTransition(() => {
        setMessage("")
      })
    }
  }, [initialMessage])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const displayRating = hoverRating ?? rating

  const fieldError = useMemo(() => {
    return {
      rating: state.errors?.rating,
      message: state.errors?.message,
    }
  }, [state.errors])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setRating(0)}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear rating
          </button>
        </div>
        <div
          id="rating-picker"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm"
        >
          <div
            className="flex items-center gap-1"
            aria-label={`Rating ${rating} of 5`}
          >
            {ratingOptions.map((value) => {
              const active = value <= displayRating
              return (
                <button
                  key={value}
                  type="button"
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(null)}
                  onFocus={() => setHoverRating(value)}
                  onBlur={() => setHoverRating(null)}
                  onClick={() => setRating(value)}
                  className="group"
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                >
                  <Star
                    size={20}
                    className={cn(
                      "transition-colors",
                      active
                        ? "fill-yellow-400 text-yellow-500"
                        : "text-slate-300 group-hover:text-yellow-400",
                    )}
                  />
                </button>
              )
            })}
          </div>
          <span className="ml-2 text-sm font-semibold text-slate-700">
            {displayRating}/5
          </span>
        </div>
        {fieldError.rating && (
          <p className="text-sm text-destructive">{fieldError.rating}</p>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          id="product-review-message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-label="Review"
          placeholder="What stood out? How did this product help you?"
          rows={6}
          cols={60}
          className="resize-none border-slate-200 bg-white/80 min-h-[180px] text-base"
        />
        {fieldError.message && (
          <p className="text-sm text-destructive">{fieldError.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[20px] text-sm text-muted-foreground">
          {showSuccess && state.message && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              {state.message}
            </span>
          )}
          {state.status === "error" && state.message && !showSuccess && (
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              <XCircle size={16} /> {state.message}
            </span>
          )}
        </div>
        <SubmitButton />
      </div>
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant="outline"
      size="lg"
      className="rounded-full border-border bg-white px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm shadow-black/5 transition-colors hover:bg-muted/70 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {pending ? "Submitting…" : "Post review"}
    </Button>
  )
}
