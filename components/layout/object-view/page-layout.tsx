import PageContainer from "@/components/layout/page-container"
import {
  OverviewCard,
  OverviewRow,
} from "@/components/layout/object-view/overview"
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
}

export function ObjectPageLayout({
  heading,
  overview,
  basePath,
  deletable = false,
  editable = false,
  relationships = null,
}: ObjectPageLayoutProps) {
  return (
    <>
      <ClientObjectHeading
        {...heading}
        basePath={basePath}
        deletable={deletable}
        editable={editable}
      />

      <div className="w-full bg-muted py-6">
        <div className="w-full px-4 md:px-6">
          <OverviewCard title="Overview">
            {overview.map((field) => (
              <OverviewRow
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </OverviewCard>
          {relationships && (
            <div className="mt-6 space-y-6">{relationships}</div>
          )}
        </div>
      </div>
    </>
  )
}
