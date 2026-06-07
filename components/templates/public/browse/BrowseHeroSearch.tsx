"use client"

import { type SyntheticEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { BROWSE_PATH, categoryPath, usecasePath } from "@/lib/routes"
import { buildQuery } from "@/lib/urlParams"

type BrowseHeroCategory = {
  slug: string
  name: string
}

type BrowseHeroUseCase = {
  slug: string
  label: string
}

interface BrowseHeroSearchProps {
  query?: string
  categories: BrowseHeroCategory[]
  useCases: BrowseHeroUseCase[]
  launchedCount: number
}

export function BrowseHeroSearch({
  query,
  categories,
  useCases,
  launchedCount,
}: BrowseHeroSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(query ?? "")

  const trendingLinks = useMemo(() => {
    const categoryLinks = categories.slice(0, 2).map((item) => ({
      href: categoryPath(item.slug),
      label: item.name,
    }))
    const useCaseLinks = useCases.slice(0, 1).map((item) => ({
      href: usecasePath(item.slug),
      label: item.label,
    }))
    return [...categoryLinks, ...useCaseLinks]
  }, [categories, useCases])

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    const nextUrl = buildQuery(BROWSE_PATH, searchParams, {
      q: trimmed || undefined,
      page: undefined,
    })

    router.push(nextUrl, { scroll: false })
  }

  return (
    <section className="bg-[#061d31] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#10b981]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#10b981]">
              Global Discovery
            </span>
            <span className="text-sm font-medium text-white/65">
              {launchedCount.toLocaleString("en-US")} products ready to explore
            </span>
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-5xl">
            What&apos;s the next big thing in tech?
          </h1>
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-2 rounded-lg border border-white/15 bg-white/10 p-2 md:flex-row"
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search products</span>
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45"
                aria-hidden="true"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 w-full rounded-md border-0 bg-transparent pl-12 pr-4 text-base text-white placeholder:text-white/45 focus:ring-2 focus:ring-[#10b981]"
                placeholder="Search AI tools, analytics, infrastructure..."
                type="search"
              />
            </label>
            <div className="flex gap-2">
              <button className="h-12 rounded-md bg-[#10b981] px-6 text-sm font-extrabold text-white transition hover:bg-[#0ea371] active:scale-95">
                Explore
              </button>
            </div>
          </form>
          {trendingLinks.length ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/45">
                Trending
              </span>
              {trendingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-[#10b981] hover:bg-[#10b981]"
                >
                  #{item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
