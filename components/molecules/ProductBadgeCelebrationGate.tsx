"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"

export default function ProductBadgeCelebrationGate({
  initialOpen,
}: {
  initialOpen: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(initialOpen)

  const celebratePresent = useMemo(() => {
    const raw = searchParams?.getAll("celebrate") ?? []
    return raw.includes("1")
  }, [searchParams])

  useEffect(() => {
    if (initialOpen || celebratePresent) {
      setOpen(true)
    }
  }, [initialOpen, celebratePresent])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && celebratePresent) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("celebrate")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    }
  }

  if (!open && !initialOpen && !celebratePresent) return null

  return (
    <ProductBadgeCelebrationDialog
      open={open}
      onOpenChange={handleOpenChange}
    />
  )
}
