"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { VersusProduct } from "@/actions/public/products/versus"
import { Button } from "@/components/atoms/button"
import UpvoteSquareButton from "@/components/molecules/UpvoteSquareButton"
import {
  VersusCard,
  VersusDivider,
} from "@/components/molecules/versus/VersusCard"

interface VersusArenaProps {
  initialMatchup: VersusProduct[]
}

interface MatchupResponse {
  matchup?: VersusProduct[]
}

export function VersusArena({ initialMatchup }: VersusArenaProps) {
  const [matchup, setMatchup] = useState<VersusProduct[]>(initialMatchup)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matchupIds = useMemo(
    () => matchup.map((product) => product.id),
    [matchup],
  )

  const fetchNextMatchup = useCallback(async () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      matchupIds.forEach((id) => params.append("exclude", id))

      const response = await fetch(
        `/api/products/versus${params.size ? `?${params.toString()}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to load a new matchup")
      }

      const payload = (await response.json()) as MatchupResponse
      const nextMatchup = Array.isArray(payload.matchup)
        ? payload.matchup.filter(Boolean)
        : []

      if (!nextMatchup.length) {
        throw new Error("No contenders available right now. Try again soon.")
      }

      setMatchup(nextMatchup)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to refresh matchup"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [matchupIds])

  useEffect(
    () => () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current)
        autoAdvanceRef.current = null
      }
    },
    [],
  )

  const scheduleAutoAdvance = useCallback(() => {
    if (loading || autoAdvanceRef.current) {
      return
    }
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      void fetchNextMatchup()
    }, 700)
  }, [fetchNextMatchup, loading])

  if (matchup.length === 0) {
    return (
      <div className="rounded-3xl border border-border/70 bg-white/70 p-12 text-center shadow-sm shadow-black/5">
        <h2 className="text-2xl font-semibold text-foreground">
          No contenders just yet
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          We&apos;re loading matches. Check back in a moment to put two launches
          head to head.
        </p>
      </div>
    )
  }

  const [left, right] = matchup
  const matchupKey = matchupIds.join("_") || "matchup"

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-white p-6 shadow-[0_60px_160px_-85px_rgba(7,58,104,0.75)] md:p-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
          Community battle
        </p>
        <h2 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
          Pick the launch you believe should climb the board
        </h2>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Cast your vote to push a product ahead. Spin up fresh matchups to keep
          the arena moving and help rank emerging launches.
        </p>
      </header>

      <div
        key={matchupKey}
        className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-border/60 bg-white/95 p-6 shadow-[0_28px_90px_-60px_rgba(7,58,104,0.65)] md:p-8 animate-[battle-refresh_220ms_ease-out]"
      >
        <div className="relative z-10 flex flex-col items-center gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-0">
          <VersusCard
            product={left}
            side="left"
            action={({ className }) => (
              <UpvoteSquareButton
                productId={left.id}
                initialCount={left.upvotes}
                initialUpvoted={left.upvoted}
                title={`${left.upvotes.toLocaleString()} upvotes`}
                className={className}
                compact
                onVoteChange={({ upvoted }) => {
                  if (upvoted) {
                    scheduleAutoAdvance()
                  }
                }}
              />
            )}
          />
          <VersusDivider />
          {right ? (
            <VersusCard
              product={right}
              side="right"
              action={({ className }) => (
                <UpvoteSquareButton
                  productId={right.id}
                  initialCount={right.upvotes}
                  initialUpvoted={right.upvoted}
                  title={`${right.upvotes.toLocaleString()} upvotes`}
                  className={className}
                  compact
                  onVoteChange={({ upvoted }) => {
                    if (upvoted) {
                      scheduleAutoAdvance()
                    }
                  }}
                />
              )}
            />
          ) : null}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_-20%,rgba(24,96,168,0.18),transparent_65%),radial-gradient(circle_at_85%_120%,rgba(155,93,229,0.2),transparent_65%)]"
        />
        {loading ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--brand-1)] border-t-transparent" />
            <p className="text-xs font-medium text-muted-foreground">
              Loading matchup…
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={fetchNextMatchup}
          disabled={loading}
          className="w-full max-w-sm"
        >
          {loading ? "Loading matchup…" : "Spin a new matchup"}
        </Button>
        {error ? (
          <p className="text-sm text-destructive text-center">{error}</p>
        ) : null}
      </div>
    </section>
  )
}

export default VersusArena
