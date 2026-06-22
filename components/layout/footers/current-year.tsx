"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}
const getCurrentYear = () => String(new Date().getFullYear())
const getServerYear = () => ""

export function CurrentYear() {
  const year = useSyncExternalStore(subscribe, getCurrentYear, getServerYear)

  return (
    <span className="inline-block min-w-[4ch]" suppressHydrationWarning>
      {year}
    </span>
  )
}
