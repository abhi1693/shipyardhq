import { ObjectHeading } from "@/components/layout/object-view/heading"
import {
  OverviewCard,
  OverviewRow,
} from "@/components/layout/object-view/overview"
import PageContainer from "@/components/layout/page-container"

interface ObjectPageLayoutProps {
  heading: {
    id: string
    title: string
    createdAt: string | Date
    updatedAt: string | Date
    slug?: string | null
  }
  overview: { label: string; value: React.ReactNode }[]
}

export function ObjectPageLayout({ heading, overview }: ObjectPageLayoutProps) {
  return (
    <PageContainer>
      <ObjectHeading
        id={heading.id}
        title={heading.title}
        createdAt={heading.createdAt}
        updatedAt={heading.updatedAt}
        slug={heading.slug}
      />

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
