"use client"

import Link from "next/link"
import {
  type ChangeEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, Package, Search } from "lucide-react"

import { Card } from "@/components/atoms/card"
import { Image } from "@/components/atoms/image"
import { Input } from "@/components/atoms/input"
import { ScrollArea } from "@/components/atoms/scroll-area"
import { BROWSE_PATH } from "@/lib/routes"

type SearchSuggestion = {
  id: string
  type: "product"
  label: string
  description: string
  href: string
  image: string | null
  meta: string | null
}

type SuggestionsResponse = {
  items?: SearchSuggestion[]
  browseHref?: string
}

function buildBrowseHref(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return BROWSE_PATH

  const params = new URLSearchParams({ q: trimmed })
  return `${BROWSE_PATH}?${params.toString()}`
}

export default function PublicHeaderSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [browseHref, setBrowseHref] = useState<string>(BROWSE_PATH)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const isFocusedRef = useRef(false)
  const previousRouteKeyRef = useRef(routeKey)
  const trimmedQuery = query.trim()

  const clearSearch = () => {
    setQuery("")
    setSuggestions([])
    setBrowseHref(BROWSE_PATH)
    setIsOpen(false)
    setIsLoading(false)
  }

  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) {
      return
    }

    previousRouteKeyRef.current = routeKey
    const timeoutId = window.setTimeout(clearSearch, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [routeKey])

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Search suggestions request failed")
          }

          return response.json() as Promise<SuggestionsResponse>
        })
        .then((data) => {
          setSuggestions(data.items ?? [])
          setBrowseHref(data.browseHref ?? buildBrowseHref(trimmedQuery))
          if (isFocusedRef.current) {
            setIsOpen(true)
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }

          setSuggestions([])
          setBrowseHref(buildBrowseHref(trimmedQuery))
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        })
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [trimmedQuery])

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value
    setQuery(nextQuery)
    setBrowseHref(buildBrowseHref(nextQuery))
    if (nextQuery.trim().length >= 2) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleFocus = () => {
    clearCloseTimer()
    isFocusedRef.current = true
    if (trimmedQuery.length >= 2) {
      setIsOpen(true)
    }
  }

  const handleBlur = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      isFocusedRef.current = false
      setIsOpen(false)
    }, 120)
  }

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = query.trim()
    const params = new URLSearchParams()

    if (trimmed) {
      params.set("q", trimmed)
    }

    const nextUrl = params.size
      ? `${BROWSE_PATH}?${params.toString()}`
      : BROWSE_PATH

    clearSearch()
    router.push(nextUrl)
  }

  const shouldShowDropdown = isOpen && trimmedQuery.length >= 2
  const shouldConstrainSuggestions = suggestions.length > 5

  return (
    <form
      role="search"
      aria-label="Search products"
      className="relative hidden items-center lg:flex"
      onSubmit={handleSubmit}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Search
        className="pointer-events-none absolute left-3 size-5 text-[#74777d]"
        aria-hidden
      />
      <Input
        name="q"
        type="search"
        role="combobox"
        value={query}
        onChange={handleInputChange}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false)
          }
        }}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={shouldShowDropdown}
        aria-controls="public-header-search-suggestions"
        aria-haspopup="listbox"
        placeholder="Search products..."
        className="h-auto w-64 rounded-[12px] border-[#c4c6cd] bg-[#eff4ff] py-2 pl-10 pr-4 text-[14px] leading-5 text-[#0b1c30] shadow-none placeholder:text-[#74777d] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#0051d5]"
      />
      {shouldShowDropdown ? (
        <Card
          id="public-header-search-suggestions"
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[420px] gap-0 overflow-hidden rounded-xl border-[#D8E0EA] bg-white py-0 shadow-[0_18px_48px_-24px_rgba(11,28,48,0.45)]"
        >
          <ScrollArea
            className={
              shouldConstrainSuggestions ? "h-[278px]" : "max-h-[278px]"
            }
          >
            <div className="p-2">
              {isLoading && suggestions.length === 0 ? (
                <div className="px-3 py-4 text-[13px] leading-5 text-[#74777d]">
                  Searching...
                </div>
              ) : null}
              {!isLoading && suggestions.length === 0 ? (
                <div className="px-3 py-4 text-[13px] leading-5 text-[#74777d]">
                  No matches found.
                </div>
              ) : null}
              {suggestions.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  role="option"
                  aria-selected={false}
                  className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#EFF4FF] focus:bg-[#EFF4FF] focus:outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearSearch}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D8E0EA] bg-[#F8FAFC] text-[12px] font-bold text-[#0b1c30]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        width={36}
                        height={36}
                        sizes="36px"
                        placeholder="empty"
                        className="h-full w-full bg-white object-contain p-1"
                      />
                    ) : (
                      <Package className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-5 text-[#0b1c30]">
                        {item.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] leading-4 text-[#43474c]">
                      {item.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </ScrollArea>
          <Link
            href={browseHref}
            className="flex items-center justify-between border-t border-[#E2E8F0] bg-white px-5 py-2.5 text-[13px] font-semibold leading-5 text-[#0051d5] transition-colors hover:bg-[#EFF4FF] focus:bg-[#EFF4FF] focus:outline-none"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}
          >
            <span className="truncate">
              Search all for &quot;{trimmedQuery}&quot;
            </span>
            <ArrowUpRight className="ml-3 size-4 shrink-0" aria-hidden />
          </Link>
        </Card>
      ) : null}
    </form>
  )
}
