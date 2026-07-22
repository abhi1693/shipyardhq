"use client"

import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

type DirectoryFilterOption = {
  value: string
  label: string
  href: string
  active: boolean
}

export function DirectoryFilterControls({
  options,
  secondary,
}: {
  options: DirectoryFilterOption[]
  secondary: { href: string; label: string }
}) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.active}
            onClick={() => router.push(option.href, { scroll: false })}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition",
              option.active
                ? "border-[#0051d5] bg-[#0051d5] text-white"
                : "border-[#e2e8f0] bg-white text-[#0b1c30] hover:bg-[#f8fafc]",
            )}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => router.push(secondary.href, { scroll: false })}
          className="ml-auto rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-semibold text-[#0b1c30] transition hover:bg-[#f8fafc]"
        >
          {secondary.label}
        </button>
      </div>
    </div>
  )
}
