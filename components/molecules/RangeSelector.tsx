"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

const ranges = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
]

export default function RangeSelector({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get("range") ?? "7d"

  const setRange = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === "7d") next.delete("range")
    else next.set("range", value)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border p-1", className)}>
      {ranges.map((r) => (
        <Button
          key={r.value}
          size="sm"
          variant={current === r.value ? "default" : "ghost"}
          className={cn(
            "px-2",
            current === r.value &&
              "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] text-white",
          )}
          onClick={() => setRange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  )
}

