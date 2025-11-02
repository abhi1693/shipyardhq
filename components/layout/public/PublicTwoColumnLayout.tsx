import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PublicTwoColumnLayoutProps {
  main: ReactNode
  sidebar?: ReactNode
  className?: string
  mainClassName?: string
  sidebarClassName?: string
  gapClassName?: string
}

export function PublicTwoColumnLayout({
  main,
  sidebar,
  className,
  mainClassName,
  sidebarClassName,
  gapClassName,
}: PublicTwoColumnLayoutProps) {
  const hasSidebar = Boolean(sidebar)

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-7xl px-4 pb-24 pt-10 md:px-6",
        className,
      )}
    >
      <div
        className={cn(
          "grid gap-10",
          hasSidebar
            ? "lg:grid-cols-[minmax(0,2.6fr)_minmax(240px,0.9fr)]"
            : "lg:grid-cols-1",
          gapClassName,
        )}
      >
        <div className={cn("flex flex-col gap-8", mainClassName)}>{main}</div>
        {hasSidebar ? (
          <aside
            className={cn(
              "flex w-full max-w-sm flex-col gap-6 lg:ml-auto",
              sidebarClassName,
            )}
          >
            {sidebar}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export default PublicTwoColumnLayout
