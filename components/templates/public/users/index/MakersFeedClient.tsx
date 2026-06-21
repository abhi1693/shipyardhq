"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Star, UserPlus } from "lucide-react"

import type { PublicUsersPageResult } from "@/actions/public/users/actions"
import { getPublicUsersPage } from "@/actions/public/users/server-actions"
import { SquareImage } from "@/components/molecules/SquareImage"
import { userPath } from "@/lib/routes"

type MakerListItem = PublicUsersPageResult["items"][number]

interface MakersFeedClientProps {
  initialItems: MakerListItem[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
}

const avatarToneClasses = [
  "bg-[#d0e4ff] text-[#061d31]",
  "bg-[#dbe1ff] text-[#00174b]",
  "bg-[#ffdbca] text-[#341100]",
  "bg-[#dce9ff] text-[#0b1c30]",
]

const mapMakerMeta = (maker: MakerListItem) => {
  const first = maker.firstName?.trim() ?? ""
  const last = maker.lastName?.trim() ?? ""
  const name = `${first} ${last}`.trim() || "Shipyard maker"
  const initialsSource = name.split(/\s+/).slice(0, 2)
  const initials =
    initialsSource
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "SY"
  const launches = maker._count.products

  return { name, initials, launches }
}

export function MakersFeedClient({
  initialItems,
  initialPage,
  pageSize,
  initialHasMore,
}: MakersFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 18

  const [items, setItems] = useState<MakerListItem[]>(initialItems)
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        normalizedPageSize,
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [initialItems, normalizedInitialPage, normalizedPageSize],
  )

  useEffect(() => {
    setItems(initialItems)
    setPage(normalizedInitialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialItems, normalizedInitialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getPublicUsersPage({
        page,
        pageSize: normalizedPageSize,
      })

      setItems((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items.filter(
          (item) => !existingIds.has(item.id),
        )

        if (!nextItems.length) return previous
        return [...previous, ...nextItems]
      })

      setHasMore(result.hasMore)
      setPage((current) => {
        if (result.nextPage) return result.nextPage
        if (result.hasMore) return current + 1
        return current
      })
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, normalizedPageSize, page])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          loadMore()
        }
      },
      { rootMargin: "0px 0px 320px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, resetKey])

  if (!items.length && !hasMore) {
    return (
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c] shadow-sm">
        No makers to show yet. Check back soon.
      </section>
    )
  }

  const [featuredMaker, ...standardMakers] = items

  return (
    <div className="space-y-4">
      {featuredMaker ? <FeaturedMakerCard maker={featuredMaker} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {standardMakers.map((maker, index) => (
          <MakerCard key={maker.id} maker={maker} toneIndex={index} />
        ))}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-[#43474c]"
        >
          {isLoading ? "Loading more makers..." : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

function FeaturedMakerCard({ maker }: { maker: MakerListItem }) {
  const { name, initials, launches } = mapMakerMeta(maker)

  return (
    <Link
      href={userPath(maker.id)}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-xl border border-[#0051d5]/20 bg-white p-6 shadow-sm transition hover:border-[#0051d5] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="absolute right-3 top-3 text-[#0051d5]">
        <Star className="h-5 w-5 fill-current" aria-hidden />
      </div>
      <div className="relative z-10 flex items-center gap-5">
        <MakerAvatar
          name={name}
          initials={initials}
          avatarUrl={maker.avatarUrl}
          featured
        />
        <div>
          <h3 className="text-2xl font-semibold leading-8 text-black">
            {name}
          </h3>
          <p className="mt-1 text-sm text-[#43474c]">
            Maker with published Shipyard launches
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded bg-[#dbe1ff] px-2 py-1 text-xs font-bold uppercase text-[#003ea7]">
              {launches.toLocaleString()} launches
            </span>
            <span className="text-xs text-[#74777d]">Top active maker</span>
          </div>
        </div>
      </div>
      <span className="inline-flex items-center justify-center rounded-lg bg-[#0051d5] px-5 py-2 text-sm font-bold text-white transition group-hover:px-7">
        View Profile
      </span>
    </Link>
  )
}

function MakerCard({
  maker,
  toneIndex,
}: {
  maker: MakerListItem
  toneIndex: number
}) {
  const { name, initials, launches } = mapMakerMeta(maker)

  return (
    <Link
      href={userPath(maker.id)}
      className="group flex min-h-36 flex-col rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MakerAvatar
            name={name}
            initials={initials}
            avatarUrl={maker.avatarUrl}
            toneIndex={toneIndex}
          />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold leading-6 text-black">
              {name}
            </h4>
            <p className="truncate text-xs text-[#43474c]">Shipyard maker</p>
          </div>
        </div>
        <span className="rounded-full p-2 text-[#0051d5] transition group-hover:bg-[#dbe1ff]">
          <UserPlus className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-[#e2e8f0] pt-4 text-xs">
        <span className="font-bold text-[#f97316]">
          {launches.toLocaleString()} launch{launches === 1 ? "" : "es"}
        </span>
        <span className="text-[#74777d]">Profile live</span>
      </div>
    </Link>
  )
}

function MakerAvatar({
  name,
  initials,
  avatarUrl,
  featured = false,
  toneIndex = 0,
}: {
  name: string
  initials: string
  avatarUrl?: string | null
  featured?: boolean
  toneIndex?: number
}) {
  const sizeClass = featured ? "h-20 w-20" : "h-12 w-12"
  const toneClass = avatarToneClasses[toneIndex % avatarToneClasses.length]

  return (
    <span
      className={`${sizeClass} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white font-bold shadow-sm ${toneClass}`}
    >
      {avatarUrl ? (
        <SquareImage
          src={avatarUrl}
          alt={`${name} avatar`}
          size={featured ? 88 : 56}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
      {featured ? (
        <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-[#16a34a]" />
      ) : null}
    </span>
  )
}

export default MakersFeedClient
