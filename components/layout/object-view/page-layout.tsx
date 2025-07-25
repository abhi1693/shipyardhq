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
  deletable?: boolean
}

export function ObjectPageLayout({
  heading,
  overview,
  deletable = false,
}: ObjectPageLayoutProps) {
  return (
    <PageContainer>
      <ClientObjectHeading {...heading} deletable={deletable} />

      <div className="w-full bg-muted py-6">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
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
      </div>
    </PageContainer>
  )
}
