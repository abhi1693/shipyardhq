"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { BadgeCheck, ChevronUp } from "lucide-react"

import { Card, CardContent } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import SignInButton from "@/components/molecules/SignInButton"
import type {
  HomepageFeedItem,
  HomepageFeedPageResult,
} from "@/actions/public/homepage/feed"
import { BROWSE_PATH, categoryPath, productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")
const SPONSORED_DROP_INTERVAL = 8

type HomepageVoteStateContextValue = {
  isVoted: (productId?: string) => boolean
  markVoted: (productId?: string) => void
  registerProductIds: (productIds: string[]) => void
}

const HomepageVoteStateContext = createContext<HomepageVoteStateContextValue>({
  isVoted: () => false,
  markVoted: () => {},
  registerProductIds: () => {},
})

export function HomepageVoteStateProvider({
  productIds,
  children,
}: {
  productIds: string[]
  children: ReactNode
}) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [voteSnapshot, setVoteSnapshot] = useState<{
    userKey: string | null
    ids: Set<string>
  }>(() => ({ userKey: null, ids: new Set() }))
  const requestedIdsRef = useRef<Set<string>>(new Set())
  const productIdsKey = useMemo(() => productIds.join("|"), [productIds])
  const normalizedProductIds = useMemo(
    () => productIdsKey.split("|").filter(Boolean),
    [productIdsKey],
  )
  const userKey = user?.id ?? null

  const fetchVoteState = useCallback(
    async (ids: string[]) => {
      if (!isLoaded || !isSignedIn) return

      const nextIds = Array.from(new Set(ids))
        .filter(Boolean)
        .filter((id) => !requestedIdsRef.current.has(id))
      if (!nextIds.length) return

      nextIds.forEach((id) => requestedIdsRef.current.add(id))

      try {
        const activeUserKey = userKey
        const response = await fetch("/api/homepage/votes", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ productIds: nextIds }),
        })
        if (!response.ok) return

        const payload = (await response.json()) as {
          votedProductIds?: unknown
        }
        const votedProductIds = payload.votedProductIds
        if (!Array.isArray(votedProductIds)) return

        setVoteSnapshot((current) => {
          const next = new Set(
            current.userKey === activeUserKey ? current.ids : [],
          )
          votedProductIds
            .filter((id): id is string => typeof id === "string")
            .forEach((id) => next.add(id))
          return { userKey: activeUserKey, ids: next }
        })
      } catch {
        nextIds.forEach((id) => requestedIdsRef.current.delete(id))
      }
    },
    [isLoaded, isSignedIn, userKey],
  )

  useEffect(() => {
    requestedIdsRef.current = new Set()

    if (isLoaded && isSignedIn) {
      void fetchVoteState(normalizedProductIds)
    }
  }, [fetchVoteState, isLoaded, isSignedIn, normalizedProductIds, userKey])

  const value = useMemo<HomepageVoteStateContextValue>(
    () => ({
      isVoted: (productId) =>
        Boolean(
          productId &&
          voteSnapshot.userKey === userKey &&
          voteSnapshot.ids.has(productId),
        ),
      markVoted: (productId) => {
        if (!productId) return
        requestedIdsRef.current.add(productId)
        setVoteSnapshot((current) => {
          const next = new Set(current.userKey === userKey ? current.ids : [])
          next.add(productId)
          return { userKey, ids: next }
        })
      },
      registerProductIds: (ids) => {
        void fetchVoteState(ids)
      },
    }),
    [fetchVoteState, userKey, voteSnapshot],
  )

  return (
    <HomepageVoteStateContext.Provider value={value}>
      {children}
    </HomepageVoteStateContext.Provider>
  )
}

function useHomepageVoteState() {
  return useContext(HomepageVoteStateContext)
}

function useCurrentRedirect() {
  const [redirectUrl] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined
    const { pathname, search, hash } = window.location
    return `${pathname}${search}${hash}`
  })

  return redirectUrl
}

export function HomepageUpvoteButton({
  productId,
  productSlug,
  initialCount,
  initialUpvoted,
  className,
  dark = false,
  fullLabel = false,
  countIncrement = 1,
  syncResponseCount = true,
}: {
  productId?: string
  productSlug?: string
  initialCount: number
  initialUpvoted?: boolean
  className?: string
  dark?: boolean
  fullLabel?: boolean
  countIncrement?: number
  syncResponseCount?: boolean
}) {
  const { isSignedIn } = useUser()
  const voteState = useHomepageVoteState()
  const redirectUrl = useCurrentRedirect()
  const resolvedInitialUpvoted = Boolean(
    initialUpvoted || voteState.isVoted(productId),
  )
  const [state, setState] = useState({
    count: initialCount,
    upvoted: resolvedInitialUpvoted,
    pending: false,
  })

  useEffect(() => {
    setState({
      count: initialCount,
      upvoted: resolvedInitialUpvoted,
      pending: false,
    })
  }, [initialCount, resolvedInitialUpvoted])

  async function toggleUpvote() {
    if (state.pending) return
    if (state.upvoted) return

    const nextUpvoted = true
    const optimisticCount = Math.max(0, state.count + countIncrement)
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
          syncResponseCount && typeof payload.upvotes === "number"
            ? payload.upvotes
            : optimisticCount,
        upvoted:
          typeof payload.upvoted === "boolean" ? payload.upvoted : nextUpvoted,
        pending: false,
      })
      voteState.markVoted(productId)
    } catch {
      setState({ ...previous, pending: false })
    }
  }

  const buttonClassName = cn(
    "inline-flex h-auto cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-pointer disabled:opacity-70",
    dark
      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      : "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]",
    className,
    state.upvoted &&
      (dark
        ? "border-[#C0FF00] bg-[#C0FF00] text-[#061d31] hover:bg-[#C0FF00]/90"
        : "bg-[#0051d5] text-white hover:bg-[#0048bf]"),
  )
  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
          state.upvoted && (dark ? "bg-black/10" : "bg-white/20"),
        )}
      >
        <ChevronUp
          className={cn("size-4", state.upvoted && "stroke-[3]")}
          aria-hidden
        />
      </span>
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
      disabled={state.pending || state.upvoted}
      aria-pressed={state.upvoted}
    >
      {content}
    </Button>
  )
}

export type HomepageDropListItem = {
  id?: string
  slug?: string
  name: string
  tagline: string
  logo?: string | null
  category?: string | null
  categorySlug?: string | null
  upvoteCount: number
  scoreCount?: number | null
  isSponsored?: boolean
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
  shuffleRank?: number
}

type HomepageDropSection = {
  key: string
  title: string
  items: HomepageDropListItem[]
}

function toDropListItem(item: HomepageFeedItem): HomepageDropListItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    tagline: item.tagline,
    logo: item.logo,
    category: item.category,
    categorySlug: item.categorySlug,
    upvoteCount: item.upvoteCount,
    scoreCount: item.scoreCount,
    isSponsored: item.isSponsored,
    isVoted: item.isVoted,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    shuffleRank: item.shuffleRank,
  }
}

function dropKey(product: HomepageDropListItem) {
  return product.id ?? product.slug ?? product.name
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
}

function getDropDate(item: HomepageDropListItem) {
  return item.publishedAt ?? item.createdAt
}

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addUtcDays(time: number, days: number) {
  return time + days * 24 * 60 * 60 * 1000
}

function buildDropSections(
  items: HomepageDropListItem[],
  referenceDateIso: string,
): HomepageDropSection[] {
  const referenceDate = new Date(referenceDateIso)
  const referenceTime = Number.isNaN(referenceDate.getTime())
    ? Date.now()
    : referenceDate.getTime()
  const startToday = startOfUtcDay(new Date(referenceTime))
  const startYesterday = addUtcDays(startToday, -1)
  const startThisWeek = addUtcDays(startToday, -7)
  const sponsoredItems = items.filter((item) => item.isSponsored)

  type BucketKey = "today" | "yesterday" | "thisWeek"
  const bucketOrder: Array<{ key: BucketKey; title: string }> = [
    { key: "today", title: "Today" },
    { key: "yesterday", title: "Yesterday" },
    { key: "thisWeek", title: "This Week" },
  ]
  const buckets = new Map<BucketKey, HomepageDropListItem[]>(
    bucketOrder.map((bucket) => [bucket.key, []]),
  )

  items
    .filter((item) => !item.isSponsored)
    .forEach((item) => {
      const published = new Date(getDropDate(item) ?? referenceDateIso)
      const publishedTime = published.getTime()
      const resolvedTime = Number.isNaN(publishedTime)
        ? referenceTime
        : publishedTime

      let bucketKey: BucketKey | null = null
      if (resolvedTime >= startToday) {
        bucketKey = "today"
      } else if (resolvedTime >= startYesterday) {
        bucketKey = "yesterday"
      } else if (resolvedTime >= startThisWeek) {
        bucketKey = "thisWeek"
      }

      if (!bucketKey) return
      buckets.get(bucketKey)?.push(item)
    })

  const sections: HomepageDropSection[] = []
  let organicIndex = 0
  let sponsoredIndex = 0

  bucketOrder.forEach((bucket) => {
    const organicItems = buckets.get(bucket.key) ?? []
    const sectionItems: HomepageDropListItem[] = []

    if (
      sponsoredIndex === 0 &&
      sponsoredIndex < sponsoredItems.length &&
      organicItems.length > 0
    ) {
      sectionItems.push(sponsoredItems[sponsoredIndex])
      sponsoredIndex += 1
    }

    organicItems.forEach((item) => {
      sectionItems.push(item)
      organicIndex += 1

      if (
        organicIndex % SPONSORED_DROP_INTERVAL === 0 &&
        sponsoredIndex < sponsoredItems.length
      ) {
        sectionItems.push(sponsoredItems[sponsoredIndex])
        sponsoredIndex += 1
      }
    })

    sections.push({
      key: bucket.key,
      title: bucket.title,
      items: sectionItems,
    })
  })

  return sections
}

function uniqueDropItems(items: HomepageDropListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = dropKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function DropProductLogo({
  product,
  sponsored,
}: {
  product: HomepageDropListItem
  sponsored: boolean
}) {
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-black shadow-sm",
        sponsored
          ? "border border-white/20 bg-white/10 text-white"
          : "bg-[#e5eeff] text-[#061d31]",
      )}
    >
      {product.logo ? (
        <Image
          src={product.logo}
          alt={`${product.name} logo`}
          width={56}
          height={56}
          sizes="56px"
          className={cn(
            "h-full w-full object-cover",
            sponsored ? "contrast-125" : "h-10 w-10",
          )}
          unoptimized
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function HomepageDropRow({ product }: { product: HomepageDropListItem }) {
  const sponsored = Boolean(product.isSponsored)
  const href = product.slug ? productPath(product.slug) : BROWSE_PATH
  const categoryLabel = product.category ?? "New Tool"
  const categoryClassName = cn(
    "hidden shrink-0 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px] sm:inline-flex",
    sponsored
      ? "bg-[#C0FF00] text-black hover:bg-[#C0FF00]/90"
      : "bg-[#F8FAFC] text-[#74777d] hover:bg-[#e5eeff] hover:text-[#0051d5]",
  )

  return (
    <Card
      className={cn(
        "group relative gap-0 rounded-xl py-0 shadow-none transition-all",
        sponsored
          ? "border-white/10 bg-[#213145] text-white hover:shadow-lg"
          : "border-[#E2E8F0] bg-white hover:shadow-sm",
      )}
    >
      <CardContent className="flex items-center gap-4 p-5 sm:gap-6">
        {sponsored ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 text-white/60">
            <span className="text-[9px] font-extrabold uppercase leading-[10px] tracking-widest">
              Sponsored
            </span>
            <BadgeCheck className="size-3" aria-hidden />
          </div>
        ) : null}
        <DropProductLogo product={product} sponsored={sponsored} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <Link
              href={href}
              className="truncate text-lg font-semibold leading-6 hover:underline"
            >
              {product.name}
            </Link>
            {product.categorySlug ? (
              <Link
                href={categoryPath(product.categorySlug)}
                className={categoryClassName}
              >
                {categoryLabel}
              </Link>
            ) : (
              <span className={categoryClassName}>{categoryLabel}</span>
            )}
          </div>
          <p
            className={cn(
              "truncate text-sm leading-5",
              sponsored ? "text-white/70" : "text-[#43474c]",
            )}
          >
            {product.tagline}
          </p>
        </div>
        <div
          className={cn(
            "pl-4 sm:pl-6",
            sponsored
              ? "border-l border-white/10"
              : "border-l border-[#E2E8F0]",
          )}
        >
          <HomepageUpvoteButton
            productId={product.id}
            productSlug={product.slug}
            initialCount={product.scoreCount ?? 0}
            initialUpvoted={product.isVoted}
            countIncrement={10}
            syncResponseCount={false}
            dark={sponsored}
            className={cn(
              "min-w-16 flex-col gap-0 rounded-r-xl bg-transparent px-3 py-2 shadow-none",
              sponsored
                ? "text-[#C0FF00] hover:bg-white/10"
                : "text-[#0051d5] hover:bg-[#EFF6FF]",
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function HomepageDropsInfiniteList({
  initialItems,
  initialHasMore,
  initialNextPage,
  pageSize,
  excludedSlug,
  referenceDateIso,
}: {
  initialItems: HomepageDropListItem[]
  initialHasMore: boolean
  initialNextPage: number | null
  pageSize: number
  excludedSlug?: string
  referenceDateIso: string
}) {
  const initialUniqueItems = useMemo(
    () => uniqueDropItems(initialItems),
    [initialItems],
  )
  const [items, setItems] = useState(initialUniqueItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPage, setNextPage] = useState(initialNextPage)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const sentinelVisibleRef = useRef(false)
  const seenKeysRef = useRef(new Set(initialUniqueItems.map(dropKey)))
  const voteState = useHomepageVoteState()
  const sections = useMemo(
    () => buildDropSections(items, referenceDateIso),
    [items, referenceDateIso],
  )

  const loadMore = useCallback(async () => {
    if (loading || error || !hasMore || !nextPage) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      })
      const response = await fetch(`/api/homepage/feed?${params.toString()}`, {
        headers: { accept: "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to load drops")
      }

      const payload = (await response.json()) as HomepageFeedPageResult
      const nextItems = payload.items
        .filter((item) => !excludedSlug || item.slug !== excludedSlug)
        .map(toDropListItem)
        .filter((item) => {
          const key = dropKey(item)
          if (seenKeysRef.current.has(key)) return false
          seenKeysRef.current.add(key)
          return true
        })

      voteState.registerProductIds(
        nextItems
          .map((item) => item.id)
          .filter((id): id is string => Boolean(id)),
      )
      setItems((current) => [...current, ...nextItems])
      setHasMore(payload.hasMore)
      setNextPage(payload.nextPage)
    } catch {
      setError("More drops could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [error, excludedSlug, hasMore, loading, nextPage, pageSize, voteState])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting)

        if (!isIntersecting) {
          sentinelVisibleRef.current = false
          return
        }

        if (!sentinelVisibleRef.current) {
          sentinelVisibleRef.current = true
          void loadMore()
        }
      },
      { rootMargin: "160px 0px" },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore])

  if (items.length === 0 && !hasMore) {
    return (
      <Card className="rounded-xl border-[#E2E8F0] bg-white py-0 shadow-sm">
        <CardContent className="p-5 text-sm text-[#43474c]">
          No drops are live yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <div className="flex items-center gap-3">
            <h4 className="shrink-0 text-lg font-semibold text-black">
              {section.title}
            </h4>
            <span className="h-px flex-1 bg-[#E2E8F0]" aria-hidden />
          </div>
          <div className="space-y-3">
            {section.items.length > 0 ? (
              section.items.map((product) => (
                <HomepageDropRow key={dropKey(product)} product={product} />
              ))
            ) : (
              <Card className="rounded-xl border-dashed border-[#D8E0EA] bg-white/60 py-0 shadow-none">
                <CardContent className="p-4 text-sm text-[#74777d]">
                  No launches in this window yet.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ))}

      <div ref={sentinelRef} className="min-h-10" aria-hidden />

      <div className="pt-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#74777d]">
        {loading ? "Loading more drops..." : null}
        {!loading && error ? error : null}
        {!loading && !error && !hasMore && items.length > 0
          ? "You've reached the end of this week's launches."
          : null}
      </div>
    </div>
  )
}
