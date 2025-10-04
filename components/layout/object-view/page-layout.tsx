import type { ReactNode } from "react"
import {
  OverviewCard,
  OverviewRow,
} from "@/components/layout/object-view/overview"
import { ClientObjectHeading } from "./client-object-heading"
import { cn } from "@/lib/utils"

interface ObjectPageLayoutProps {
  heading: {
    id: string
    title: string
    createdAt: string | Date
    updatedAt: string | Date
    slug?: string | null
  }
  overview: { label: string; value: React.ReactNode }[]
  basePath: string
  deletable?: boolean
  editable?: boolean
  relationships?: React.ReactNode
  sidebar?: React.ReactNode
  topRowExtras?: React.ReactNode[]
  headingActionsLeft?: React.ReactNode
  surfaceClassName?: string
  overviewCardClassName?: string
}

export function ObjectPageLayout({
  heading,
  overview,
  basePath,
  deletable = false,
  editable = false,
  relationships = null,
  sidebar = null,
  topRowExtras = undefined,
  headingActionsLeft = null,
  surfaceClassName,
  overviewCardClassName,
}: ObjectPageLayoutProps) {
  const hasOverview = Array.isArray(overview) && overview.length > 0
  const extrasList = (
    Array.isArray(topRowExtras) ? topRowExtras : sidebar ? [sidebar] : []
  ).filter((node): node is ReactNode => node !== null && node !== undefined)
  return (
    <>
      <ClientObjectHeading
        {...heading}
        basePath={basePath}
        deletable={deletable}
        editable={editable}
        extraActions={headingActionsLeft}
      />

      <div className={cn("w-full bg-muted py-6", surfaceClassName)}>
        <div className="w-full px-4 md:px-6">
          {extrasList.length === 0 && hasOverview && (
            <OverviewCard title="Overview" className={overviewCardClassName}>
              {overview.map((field) => (
                <OverviewRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </OverviewCard>
          )}
          {extrasList.length === 1 &&
            (hasOverview ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <OverviewCard
                    title="Overview"
                    className={overviewCardClassName}
                  >
                    {overview.map((field) => (
                      <OverviewRow
                        key={field.label}
                        label={field.label}
                        value={field.value}
                      />
                    ))}
                  </OverviewCard>
                </div>
                <aside className="lg:col-span-4">
                  <div className="space-y-4">{extrasList[0]}</div>
                </aside>
              </div>
            ) : (
              <div className="space-y-4">{extrasList[0]}</div>
            ))}
          {extrasList.length >= 2 && (
            <>
              {/* When 2 extras, keep simple 4-4-4 layout */}
              {extrasList.length === 2 && (
                <div className="grid grid-cols-12 gap-6">
                  {hasOverview && (
                    <div className="col-span-12 lg:col-span-4">
                      <OverviewCard
                        title="Overview"
                        className={overviewCardClassName}
                      >
                        {overview.map((field) => (
                          <OverviewRow
                            key={field.label}
                            label={field.label}
                            value={field.value}
                          />
                        ))}
                      </OverviewCard>
                    </div>
                  )}
                  <aside className="col-span-12 lg:col-span-4">
                    <div className="space-y-4">{extrasList[0]}</div>
                  </aside>
                  <aside className="col-span-12 lg:col-span-4">
                    <div className="space-y-4">{extrasList[1]}</div>
                  </aside>
                </div>
              )}
              {/* When 3 extras, nest the right side to avoid overview-induced gaps */}
              {extrasList.length === 3 && (
                <div className="grid grid-cols-12 gap-6">
                  {hasOverview && (
                    <div className="col-span-12 lg:col-span-4">
                      <OverviewCard
                        title="Overview"
                        className={overviewCardClassName}
                      >
                        {overview.map((field) => (
                          <OverviewRow
                            key={field.label}
                            label={field.label}
                            value={field.value}
                          />
                        ))}
                      </OverviewCard>
                    </div>
                  )}
                  <div className="col-span-12 lg:col-span-8">
                    <div className="grid grid-cols-12 gap-6">
                      <aside className="col-span-12 md:col-span-6">
                        <div className="space-y-4">{extrasList[0]}</div>
                      </aside>
                      <aside className="col-span-12 md:col-span-6">
                        <div className="space-y-4">{extrasList[1]}</div>
                      </aside>
                      <aside className="col-span-12">
                        <div className="space-y-4">{extrasList[2]}</div>
                      </aside>
                    </div>
                  </div>
                </div>
              )}
              {/* Fallback for >3 extras: lay out in additional rows */}
              {extrasList.length > 3 && (
                <div className="grid grid-cols-12 gap-6">
                  {hasOverview && (
                    <div className="col-span-12 lg:col-span-4">
                      <OverviewCard
                        title="Overview"
                        className={overviewCardClassName}
                      >
                        {overview.map((field) => (
                          <OverviewRow
                            key={field.label}
                            label={field.label}
                            value={field.value}
                          />
                        ))}
                      </OverviewCard>
                    </div>
                  )}
                  <aside className="col-span-12 lg:col-span-4">
                    <div className="space-y-4">{extrasList[0]}</div>
                  </aside>
                  <aside className="col-span-12 lg:col-span-4">
                    <div className="space-y-4">{extrasList[1]}</div>
                  </aside>
                  <aside className="col-span-12 lg:col-span-8 lg:col-start-5">
                    <div className="space-y-4">{extrasList[2]}</div>
                  </aside>
                  {extrasList.slice(3).map((node, i) => (
                    <aside key={i} className="col-span-12 lg:col-span-4">
                      <div className="space-y-4">{node}</div>
                    </aside>
                  ))}
                </div>
              )}
            </>
          )}
          {relationships && (
            <div className="mt-6 space-y-6">{relationships}</div>
          )}
        </div>
      </div>
    </>
  )
}
