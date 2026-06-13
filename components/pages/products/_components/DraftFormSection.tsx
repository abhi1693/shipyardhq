import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type DraftFormSectionProps = {
  title: string
  description?: string
  icon: LucideIcon
  children: ReactNode
  accent?: "primary" | "secondary" | "orange"
  className?: string
  contentClassName?: string
  action?: ReactNode
}

const accentClassNames = {
  primary: "bg-[#061d31] text-white",
  secondary: "bg-[#346cef] text-white",
  orange: "bg-[#F97316]/10 text-[#F97316]",
}

export function DraftFormSection({
  title,
  description,
  icon: Icon,
  children,
  accent = "primary",
  className,
  contentClassName,
  action,
}: DraftFormSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded",
              accentClassNames[accent],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold leading-6 text-black">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-[14px] leading-5 text-[#43474c]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className={cn("p-5 md:p-6", contentClassName)}>{children}</div>
    </section>
  )
}
