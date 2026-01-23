"use client"

import { useEffect, useRef, useState } from "react"

type VisibilityGateOptions = {
  threshold?: number | number[]
  rootMargin?: string
  resumeDelayMs?: number
}

export function useVisibilityGate<T extends HTMLElement>({
  threshold = 0.1,
  rootMargin,
  resumeDelayMs = 500,
}: VisibilityGateOptions = {}) {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(() => {
    if (typeof IntersectionObserver === "undefined") return true
    return false
  })
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === "undefined") return true
    return document.visibilityState === "visible"
  })
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasHiddenRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  useEffect(() => {
    if (typeof document === "undefined") return

    const clearResumeTimeout = () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = null
      }
    }

    wasHiddenRef.current = document.visibilityState !== "visible"

    const updateVisibility = () => {
      const isVisible = document.visibilityState === "visible"
      if (!isVisible) {
        wasHiddenRef.current = true
        clearResumeTimeout()
        setIsPageVisible(false)
        return
      }

      if (resumeDelayMs > 0 && wasHiddenRef.current) {
        clearResumeTimeout()
        resumeTimeoutRef.current = setTimeout(() => {
          setIsPageVisible(true)
          resumeTimeoutRef.current = null
        }, resumeDelayMs)
      } else {
        setIsPageVisible(true)
      }

      wasHiddenRef.current = false
    }

    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    return () => {
      clearResumeTimeout()
      document.removeEventListener("visibilitychange", updateVisibility)
    }
  }, [resumeDelayMs])

  return { ref, isActive: isInView && isPageVisible }
}
