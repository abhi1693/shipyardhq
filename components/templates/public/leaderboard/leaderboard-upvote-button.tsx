"use client"

import { useEffect, useRef, useState } from "react"
import { Triangle } from "lucide-react"

import { cn } from "@/lib/utils"

export function LeaderboardUpvoteButton({
  productSlug,
  productName,
  count,
}: {
  productSlug: string
  productName?: string
  count: number
}) {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [state, setState] = useState(() => ({
    upvotes: count,
    upvoted: false,
    pending: false,
  }))
  const previous = useRef(state)

  useEffect(() => {
    const next = {
      upvotes: count,
      upvoted: false,
      pending: false,
    }
    setState(next)
    previous.current = next
  }, [count])

  useEffect(() => {
    if (typeof window === "undefined") return
    const { pathname, search, hash } = window.location
    setRedirectUrl(`${pathname}${search}${hash}`)
  }, [])

  const loginHref = redirectUrl
    ? `/login?${new URLSearchParams({ redirect_url: redirectUrl }).toString()}`
    : "/login"

  async function handleUpvote() {
    if (state.pending || state.upvoted) return

    const rollback = { ...state, pending: false }
    const optimistic = {
      upvotes: state.upvotes + 1,
      upvoted: true,
      pending: true,
    }

    previous.current = rollback
    setState(optimistic)

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(productSlug)}/upvote`,
        { method: "POST" },
      )
      const payload = (await response.json().catch(() => ({}))) as Partial<{
        upvotes: number
        upvoted: boolean
      }>

      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(loginHref)
          return
        }

        throw new Error("Failed to upvote product")
      }

      const next = {
        upvotes:
          typeof payload.upvotes === "number"
            ? payload.upvotes
            : optimistic.upvotes,
        upvoted:
          typeof payload.upvoted === "boolean"
            ? payload.upvoted
            : optimistic.upvoted,
        pending: false,
      }
      setState(next)
      previous.current = next
    } catch {
      setState(previous.current)
    }
  }

  const buttonClassName = cn(
    "inline-flex min-w-10 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#0051d5]/10 bg-[#EFF6FF] px-3 py-1.5 text-sm font-bold text-[#0051d5] transition-transform active:scale-95 disabled:cursor-pointer disabled:opacity-70",
    state.upvoted && "bg-[#0051d5] text-white",
  )

  const accessibleName = productName?.trim() || productSlug

  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
          state.upvoted && "bg-white/20",
        )}
      >
        <Triangle
          className="size-[18px]"
          fill={state.upvoted ? "currentColor" : "none"}
          strokeWidth={2}
          aria-hidden
        />
      </span>
      <span>{state.upvotes.toLocaleString("en-US")}</span>
    </>
  )

  return (
    <button
      type="button"
      className={buttonClassName}
      disabled={state.pending || state.upvoted}
      onClick={handleUpvote}
      aria-label={`Upvote ${accessibleName}, ${state.upvotes.toLocaleString("en-US")} votes`}
    >
      {content}
    </button>
  )
}
