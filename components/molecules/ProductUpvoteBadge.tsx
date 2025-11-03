"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { usePathname, useSearchParams } from "next/navigation"
import { Crown } from "lucide-react"

import SignInButton from "@/components/molecules/SignInButton"
import { cn } from "@/lib/utils"

interface ProductUpvoteBadgeProps {
  productId: string
  count: number
  initialUpvoted: boolean
}

const formatter = new Intl.NumberFormat("en-US")

export function ProductUpvoteBadge({
  productId,
  count,
  initialUpvoted,
}: ProductUpvoteBadgeProps) {
  const { isSignedIn } = useUser()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [state, setState] = useState(() => ({
    upvotes: count,
    upvoted: initialUpvoted,
    pending: false,
    error: null as string | null,
  }))

  const previous = useRef(state)

  useEffect(() => {
    const next = {
      upvotes: count,
      upvoted: initialUpvoted,
      pending: false,
      error: null as string | null,
    }
    setState(next)
    previous.current = next
  }, [count, initialUpvoted])

  const search = useMemo(() => {
    if (!searchParams) return ""
    const value = searchParams.toString()
    return value ? `?${value}` : ""
  }, [searchParams])

  const redirectPath = useMemo(() => {
    const basePath = pathname ?? "/"
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    return `${basePath}${search}${hash}`
  }, [pathname, search])

  async function handleToggle() {
    if (state.pending) return

    if (!isSignedIn) return

    const rollback = {
      upvotes: state.upvotes,
      upvoted: state.upvoted,
      pending: false,
      error: null as string | null,
    }

    const optimisticUpvoted = !state.upvoted
    const optimisticUpvotes = Math.max(
      state.upvotes + (optimisticUpvoted ? 1 : -1),
      0,
    )

    previous.current = rollback

    setState({
      upvotes: optimisticUpvotes,
      upvoted: optimisticUpvoted,
      pending: true,
      error: null,
    })

    try {
      const response = await fetch(`/api/products/${productId}/upvote`, {
        method: "POST",
      })
      const payload = (await response.json().catch(() => ({}))) as Partial<{
        upvotes: number
        upvoted: boolean
        error: string
      }>

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to update upvote",
        )
      }

      const resolvedUpvotes =
        typeof payload.upvotes === "number"
          ? payload.upvotes
          : optimisticUpvotes
      const resolvedUpvoted =
        typeof payload.upvoted === "boolean"
          ? payload.upvoted
          : optimisticUpvoted

      const next = {
        upvotes: resolvedUpvotes,
        upvoted: resolvedUpvoted,
        pending: false,
        error: null as string | null,
      }

      setState(next)
      previous.current = next
    } catch (error) {
      setState({
        ...rollback,
        pending: false,
        error:
          error instanceof Error ? error.message : "Failed to update upvote",
      })
      previous.current = rollback
    }
  }

  const buttonClasses = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold shadow-sm transition sm:w-auto",
    state.upvoted
      ? "border-[#1d9cf4] bg-[#1d9cf4] text-white shadow-[0_12px_30px_-18px_rgba(29,156,244,0.4)] hover:cursor-pointer"
      : "border-[#1d9cf4]/40 bg-white text-[#1d9cf4] hover:bg-[#1d9cf4]/8 hover:cursor-pointer",
    state.pending && "opacity-70",
  )

  const badgeContent = (
    <>
      <Crown className="h-4 w-4" aria-hidden />
      <span>{state.upvoted ? "Upvoted" : "Upvote"}</span>
      <span aria-hidden>·</span>
      <span>{formatter.format(state.upvotes)} votes</span>
    </>
  )

  const actionElement = isSignedIn ? (
    <button
      type="button"
      onClick={handleToggle}
      disabled={state.pending}
      className={buttonClasses}
    >
      {badgeContent}
    </button>
  ) : (
    <SignInButton
      mode="modal"
      forceRedirectUrl={redirectPath}
      signUpForceRedirectUrl={redirectPath}
    >
      <span
        className={cn(buttonClasses, "cursor-pointer")}
        role="button"
        tabIndex={0}
      >
        {badgeContent}
      </span>
    </SignInButton>
  )

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Community signal
          </p>
          <p className="text-xs text-muted-foreground">
            Live upvotes for this launch.
          </p>
        </div>
        {actionElement}
        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
      </div>
    </section>
  )
}

export default ProductUpvoteBadge
