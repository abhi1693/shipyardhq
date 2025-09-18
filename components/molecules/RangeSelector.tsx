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

    const query = next.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.25] bg-background/70 p-1 shadow-[0_18px_45px_-35px_rgba(7,78,134,0.45)] backdrop-blur",
        className,
      )}
    >
      {ranges.map((r) => (
        <Button
          key={r.value}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "rounded-full px-3 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-1)] transition",
            current === r.value &&
              "bg-[linear-gradient(120deg,var(--brand-1),var(--brand-2))] text-white shadow-[0_18px_45px_-30px_rgba(7,78,134,0.6)]",
          )}
          aria-pressed={current === r.value}
          onClick={() => setRange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  )
}
