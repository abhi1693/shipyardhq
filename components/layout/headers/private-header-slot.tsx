"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type PrivateHeaderSlotContextValue = {
  content: ReactNode
  setContent: (content: ReactNode) => void
}

const PrivateHeaderSlotContext =
  createContext<PrivateHeaderSlotContextValue | null>(null)

export function PrivateHeaderSlotProvider({
  children,
}: {
  children: ReactNode
}) {
  const [content, setContent] = useState<ReactNode>(null)
  const value = useMemo(() => ({ content, setContent }), [content])

  return (
    <PrivateHeaderSlotContext.Provider value={value}>
      {children}
    </PrivateHeaderSlotContext.Provider>
  )
}

export function usePrivateHeaderSlot() {
  return useContext(PrivateHeaderSlotContext)
}

export function PrivateHeaderSlot({ children }: { children: ReactNode }) {
  const slot = usePrivateHeaderSlot()
  const setContent = slot?.setContent

  useEffect(() => {
    if (!setContent) return
    setContent(children)
    return () => setContent(null)
  }, [children, setContent])

  return null
}
