"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Activity, ChevronUp, Handshake, X, Zap } from "lucide-react"

import { Button } from "@/components/atoms/button"
import SignInButton from "@/components/molecules/SignInButton"
import type { TrafficSidebarStatsPayload } from "@/components/templates/public/common/TrafficSidebarStatsContent"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")

function useCurrentRedirect() {
  const [redirectUrl] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined
    const { pathname, search, hash } = window.location
    return `${pathname}${search}${hash}`
  })

  return redirectUrl
}

export function HomepageUpvoteButton({
  productSlug,
  initialCount,
  initialUpvoted,
  className,
  dark = false,
  fullLabel = false,
}: {
  productSlug?: string
  initialCount: number
  initialUpvoted?: boolean
  className?: string
  dark?: boolean
  fullLabel?: boolean
}) {
  const { isSignedIn } = useUser()
  const redirectUrl = useCurrentRedirect()
  const [state, setState] = useState({
    count: initialCount,
    upvoted: Boolean(initialUpvoted),
    pending: false,
  })

  useEffect(() => {
    setState({
      count: initialCount,
      upvoted: Boolean(initialUpvoted),
      pending: false,
    })
  }, [initialCount, initialUpvoted])

  async function toggleUpvote() {
    if (state.pending) return

    const nextUpvoted = !state.upvoted
    const optimisticCount = Math.max(0, state.count + (nextUpvoted ? 1 : -1))
    const previous = state

    setState({
      count: optimisticCount,
      upvoted: nextUpvoted,
      pending: Boolean(productSlug),
    })

    if (!productSlug) {
      return
    }

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
        throw new Error("Failed to update upvote")
      }

      setState({
        count:
          typeof payload.upvotes === "number"
            ? payload.upvotes
            : optimisticCount,
        upvoted:
          typeof payload.upvoted === "boolean" ? payload.upvoted : nextUpvoted,
        pending: false,
      })
    } catch {
      setState({ ...previous, pending: false })
    }
  }

  const buttonClassName = cn(
    "inline-flex h-auto items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-70",
    dark
      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      : state.upvoted
        ? "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]"
        : "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]",
    className,
  )
  const content = (
    <>
      <ChevronUp
        className={cn("size-4", state.upvoted && "fill-current")}
        aria-hidden
      />
      <span>
        {fullLabel ? "Upvote " : ""}
        {formatter.format(state.count)}
      </span>
    </>
  )

  if (productSlug && !isSignedIn) {
    return (
      <SignInButton
        mode="modal"
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
      >
        <span className={buttonClassName} role="button" tabIndex={0}>
          {content}
        </span>
      </SignInButton>
    )
  }

  return (
    <Button
      type="button"
      className={buttonClassName}
      onClick={toggleUpvote}
      disabled={state.pending}
      aria-pressed={state.upvoted}
    >
      {content}
    </Button>
  )
}

function MiniSparkline({
  color,
  path,
}: {
  color: string
  path: string
}) {
  return (
    <svg
      className="h-10 w-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 100 40"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d={`${path}V40H0Z`} fill={color} fillOpacity="0.05" />
    </svg>
  )
}

export function HomepageAnalyticsGrid() {
  const [stats, setStats] = useState<TrafficSidebarStatsPayload | null>(null)
  const [activeBuilders, setActiveBuilders] = useState(5)

  useEffect(() => {
    let canceled = false

    fetch("/api/analytics/sidebar-stats", {
      headers: { accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load stats")
        return response.json() as Promise<TrafficSidebarStatsPayload>
      })
      .then((payload) => {
        if (!canceled) {
          setStats(payload)
          setActiveBuilders(Math.max(3, payload.realtimeVisitors ?? 5))
        }
      })
      .catch(() => {
        if (!canceled) {
          setStats({
            pageViews30: 9314,
            visitors30: 4004,
            realtimeVisitors: 5,
            trafficSeries: [],
          })
        }
      })

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveBuilders((current) => {
        const direction = Math.random() > 0.8 ? -1 : 1
        const delta = Math.random() > 0.5 ? direction : 0
        return Math.max(3, current + delta)
      })
    }, 4000)

    return () => window.clearInterval(interval)
  }, [])

  const views = stats?.pageViews30 ?? 9314
  const visitors = stats?.visitors30 ?? 4004

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <article className="col-span-1 flex min-h-[150px] flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-[#0051d5]">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
              Views
            </span>
            <Activity className="size-4 text-[#74777d]" aria-hidden />
          </div>
          <div className="text-2xl font-bold leading-none text-black">
            {formatter.format(views)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#16a34a]">
            +12.4%
          </div>
        </div>
        <div className="mt-4">
          <MiniSparkline
            color="#0051d5"
            path="M0 35C10 32 15 38 20 30C25 22 30 28 35 25C40 18 45 22 50 15C55 10 60 20 65 18C70 12 75 15 80 12C85 8 90 20 100 5"
          />
        </div>
      </article>

      <article className="col-span-1 flex min-h-[150px] flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-[#16a34a]">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
              Visitors
            </span>
            <Activity className="size-4 text-[#74777d]" aria-hidden />
          </div>
          <div className="text-2xl font-bold leading-none text-black">
            {formatter.format(visitors)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#16a34a]">
            +8.1%
          </div>
        </div>
        <div className="mt-4">
          <MiniSparkline
            color="#16a34a"
            path="M0 38C5 35 10 38 15 32C20 28 25 30 30 25C35 22 40 28 45 20C50 15 55 22 60 18C65 12 70 18 75 14C80 8 85 15 90 10C95 5 100 8"
          />
        </div>
      </article>

      <article className="relative col-span-2 flex min-h-[88px] items-center justify-between overflow-hidden rounded-xl bg-black p-4 text-white shadow-sm">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#16a34a]" />
            </span>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Live Performance
            </div>
            <div className="flex items-baseline gap-1 text-lg font-bold">
              <span>{formatter.format(activeBuilders)}</span>
              <span className="text-xs font-normal text-white/40">
                Active Builders
              </span>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 flex h-full w-24 items-center justify-center bg-gradient-to-l from-white/10 to-transparent">
          <Zap className="size-10 rotate-12 text-white/20" aria-hidden />
        </div>
      </article>
    </div>
  )
}

export function PartnerSpotlight() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 z-[60] w-full border-t border-white/10 bg-[#213145] text-white shadow-2xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2 sm:border-r sm:border-white/20 sm:pr-6">
            <Handshake className="size-5 text-[#C0FF00]" aria-hidden />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] sm:inline">
              Partner Spotlight
            </span>
          </div>
          <p className="hidden truncate text-sm text-white/90 lg:block">
            Scale your infrastructure with our new Enterprise Cloud
            integration.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            asChild
            className="h-9 rounded-full border-0 bg-[#C0FF00] px-4 text-xs font-bold uppercase tracking-[0.05em] text-black hover:bg-[#C0FF00]/90 sm:px-6"
          >
            <Link href="/pricing">Learn More</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border-0 bg-transparent p-1 text-white/60 shadow-none hover:bg-transparent hover:text-white"
            onClick={() => setVisible(false)}
            aria-label="Dismiss partner spotlight"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
