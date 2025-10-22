import * as React from "react"

import { cn } from "@/lib/utils"

import { ButtonSkeleton } from "./button.skeleton"
import { Skeleton } from "./skeleton"

interface SidebarSkeletonProps extends React.ComponentProps<"aside"> {
  collapsed?: boolean
  sections?: number
  itemsPerSection?: number
  showSearch?: boolean
  showFooter?: boolean
}

export function SidebarSkeleton({
  className,
  collapsed = false,
  sections = 3,
  itemsPerSection = 4,
  showSearch = true,
  showFooter = true,
  ...props
}: SidebarSkeletonProps) {
  const sectionCount = Math.max(1, sections)
  const itemCount = Math.max(1, itemsPerSection)

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground relative flex h-full flex-col border-r border-border/40 p-4",
        collapsed ? "w-16" : "w-64",
        className,
      )}
      data-slot="sidebar-skeleton"
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton
          className="size-10 rounded-full border border-white/10"
          tone="brand"
          shimmer={false}
        />
        {!collapsed && (
          <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
        )}
      </div>

      {showSearch && (
        <Skeleton
          className={cn(
            "mt-6 h-9 rounded-lg",
            collapsed ? "w-10 self-center" : "w-full",
          )}
          tone="soft"
          shimmer={false}
        />
      )}

      <nav className="mt-6 flex-1 space-y-6">
        {Array.from({ length: sectionCount }).map((_, section) => (
          <div key={section} className="space-y-2">
            {!collapsed && (
              <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
            )}
            <div className="space-y-1">
              {Array.from({ length: itemCount }).map((_, item) => (
                <Skeleton
                  key={item}
                  className={cn(
                    "h-8 rounded-md",
                    collapsed ? "w-10 self-center" : "w-full",
                  )}
                  tone="soft"
                  shimmer={false}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {showFooter && (
        <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
          {!collapsed && (
            <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
          )}
          <div className="flex gap-2">
            <ButtonSkeleton
              size="sm"
              variant="outline"
              labelWidth={collapsed ? "0" : "4rem"}
              className={cn(collapsed && "size-8")}
            />
            {!collapsed && (
              <ButtonSkeleton size="sm" labelWidth="5rem" />
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
