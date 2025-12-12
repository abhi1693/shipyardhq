"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Crown } from "lucide-react"

import SignInButton from "@/components/molecules/SignInButton"
import { cn } from "@/lib/utils"

interface ProductUpvoteBadgeProps {
  productSlug: string
  count: number
  initialUpvoted: boolean
  leaderboard?: {
    points: number
    rank: number | null
    available: boolean
  }
}

const formatter = new Intl.NumberFormat("en-US")

export function ProductUpvoteBadge({
  productSlug,
  count,
  initialUpvoted,
  leaderboard,
}: ProductUpvoteBadgeProps) {
  const { isSignedIn } = useUser()

  const [state, setState] = useState(() => ({
    upvotes: count,
    upvoted: initialUpvoted,
    pending: false,
    error: null as string | null,
  }))

  const previous = useRef(state)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

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

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isSignedIn) {
      setRedirectUrl(null)
      return
    }
    const { pathname, search, hash } = window.location
    setRedirectUrl(`${pathname}${search}${hash}`)
  }, [isSignedIn])

  async function handleToggle() {
    if (state.pending || state.upvoted) return

    if (!isSignedIn) return

    const rollback = {
      upvotes: state.upvotes,
      upvoted: state.upvoted,
      pending: false,
      error: null as string | null,
    }

    const optimisticUpvoted = true
    const optimisticUpvotes = state.upvotes + 1

    previous.current = rollback

    setState({
      upvotes: optimisticUpvotes,
      upvoted: optimisticUpvoted,
      pending: true,
      error: null,
    })

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(productSlug)}/upvote`,
        {
          method: "POST",
        },
      )
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
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold shadow-sm transition cursor-pointer disabled:cursor-pointer",
    state.upvoted
      ? "border-[#1d9cf4] bg-[#1d9cf4] text-white shadow-[0_12px_30px_-18px_rgba(29,156,244,0.4)]"
      : "border-[#1d9cf4]/40 bg-white text-[#1d9cf4] hover:bg-[#1d9cf4]/8 hover:cursor-pointer",
  )

  const badgeContent = (
    <>
      <Crown className="h-4 w-4" aria-hidden />
      <span>{state.upvoted ? "Upvoted" : "Upvote"}</span>
      <span aria-hidden>·</span>
      <span>{formatter.format(state.upvotes)} votes</span>
    </>
  )

  const leaderboardPoints =
    typeof leaderboard?.points === "number" && Number.isFinite(leaderboard.points)
      ? leaderboard.points
      : null
  const leaderboardRank =
    typeof leaderboard?.rank === "number" && Number.isFinite(leaderboard.rank)
      ? leaderboard.rank
      : null
  const leaderboardAvailable = Boolean(leaderboard?.available)
  const leaderboardRow =
    leaderboardPoints !== null ? (
      <div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              Points (this month)
            </dt>
            <dd className="text-lg font-semibold text-foreground">
              {formatter.format(leaderboardPoints)}
            </dd>
          </div>
          <div className="space-y-1 text-right">
            <dt className="text-xs text-muted-foreground">Rank</dt>
            <dd className="text-lg font-semibold text-foreground">
              {leaderboardRank !== null
                ? `#${formatter.format(leaderboardRank)}`
                : "—"}
            </dd>
          </div>
        </dl>
        {!leaderboardAvailable ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Leaderboard points update once leaderboard runs are generated.
          </p>
        ) : leaderboardPoints === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No points yet this month.
          </p>
        ) : null}
      </div>
    ) : null

  const actionElement = isSignedIn ? (
    <button
      type="button"
      onClick={handleToggle}
      disabled={state.pending || state.upvoted}
      className={buttonClasses}
    >
      {badgeContent}
    </button>
  ) : (
    <SignInButton
      mode="modal"
      forceRedirectUrl={redirectUrl ?? undefined}
      signUpForceRedirectUrl={redirectUrl ?? undefined}
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
          <p className="text-base font-semibold text-foreground">
            Community stats
          </p>
        </div>
        {leaderboardRow}
        {leaderboardRow ? (
          <div className="border-t border-border/60 pt-4">{actionElement}</div>
        ) : (
          actionElement
        )}
        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
      </div>
    </section>
  )
}

export default ProductUpvoteBadge
