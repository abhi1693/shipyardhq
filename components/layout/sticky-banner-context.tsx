"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import { cn } from "@/lib/utils"
import {
  StickyBannerCarousel,
  type StickyBannerProduct,
} from "@/components/organisms/StickyBannerCarousel"

type RegionEntry = {
  id: string
  priority: number
  order: number
}

interface StickyBannerContextValue {
  products: StickyBannerProduct[]
  registerRegion: (id: string, priority: number) => void
  unregisterRegion: (id: string) => void
  activeRegionId: string | null
}

const StickyBannerContext = createContext<StickyBannerContextValue | null>(null)

export function StickyBannerProvider({
  products,
  children,
}: PropsWithChildren<{ products: StickyBannerProduct[] }>) {
  const [regions, setRegions] = useState<RegionEntry[]>([])
  const orderCounter = useRef(0)

  const registerRegion = useCallback((id: string, priority: number) => {
    setRegions((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === id)
      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        if (existing.priority === priority) {
          return prev
        }
        const next = prev.slice()
        next[existingIndex] = { ...existing, priority }
        return next
      }

      return [
        ...prev,
        {
          id,
          priority,
          order: orderCounter.current++,
        },
      ]
    })
  }, [])

  const unregisterRegion = useCallback((id: string) => {
    setRegions((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const activeRegionId = useMemo(() => {
    if (!products || products.length === 0) {
      return null
    }

    if (regions.length === 0) {
      return null
    }

    return (
      regions.slice().sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        return a.order - b.order
      })[0]?.id ?? null
    )
  }, [regions, products])

  const value = useMemo<StickyBannerContextValue>(
    () => ({
      products: products ?? [],
      registerRegion,
      unregisterRegion,
      activeRegionId,
    }),
    [products, registerRegion, unregisterRegion, activeRegionId],
  )

  return (
    <StickyBannerContext.Provider value={value}>
      {children}
    </StickyBannerContext.Provider>
  )
}

export function useStickyBannerContext() {
  const ctx = useContext(StickyBannerContext)
  if (!ctx) {
    throw new Error(
      "StickyBanner components must be rendered within StickyBannerProvider",
    )
  }
  return ctx
}

type StickyBannerRegionProps = {
  priority?: number
  mode?: "immediate" | "deferred"
  className?: string
}

export function StickyBannerRegion({
  priority = 0,
  mode = "immediate",
  className,
}: StickyBannerRegionProps) {
  const { products, registerRegion, unregisterRegion, activeRegionId } =
    useStickyBannerContext()
  const id = useId()
  const hasProducts = products && products.length > 0

  useLayoutEffect(() => {
    if (mode !== "immediate" || !hasProducts) return
    registerRegion(id, priority)
    return () => {
      unregisterRegion(id)
    }
  }, [id, priority, mode, registerRegion, unregisterRegion, hasProducts])

  useEffect(() => {
    if (!hasProducts || mode !== "deferred") return
    const frame = window.requestAnimationFrame(() => {
      registerRegion(id, priority)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      unregisterRegion(id)
    }
  }, [id, priority, mode, registerRegion, unregisterRegion, hasProducts])

  const isActive = activeRegionId === id

  if (!hasProducts || !isActive) {
    return null
  }

  return (
    <div className={cn("bg-transparent", className)}>
      <StickyBannerCarousel products={products} />
    </div>
  )
}
