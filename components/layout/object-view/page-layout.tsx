import {
  OverviewCard,
  OverviewRow,
} from "@/components/layout/object-view/overview"
import { cn } from "@/lib/utils"
import { ClientObjectHeading } from "./client-object-heading"

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
  headingActionsLeft?: React.ReactNode
}

export function ObjectPageLayout({
  heading,
  overview,
  basePath,
  deletable = false,
  editable = false,
  relationships = null,
  sidebar = null,
  headingActionsLeft = null,
}: ObjectPageLayoutProps) {
  return (
    <>
      <ClientObjectHeading
        {...heading}
        basePath={basePath}
        deletable={deletable}
        editable={editable}
        extraActions={headingActionsLeft}
      />

      <div className="w-full bg-muted py-6">
        <div className="w-full px-4 md:px-6">
          <div className={cn(sidebar ? "grid grid-cols-12 gap-6" : "")}>
            <div className={cn(sidebar ? "col-span-12 lg:col-span-8" : "")}>
              <OverviewCard title="Overview">
                {overview.map((field) => (
                  <OverviewRow
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </OverviewCard>
            </div>
            {sidebar && (
              <aside className="col-span-12 lg:col-span-4">
                <div className="space-y-4">{sidebar}</div>
              </aside>
            )}
          </div>
          {relationships && (
            <div className="mt-6 space-y-6">{relationships}</div>
          )}
        </div>
      </div>
    </>
  )
}
