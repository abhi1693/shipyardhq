import { Target } from "lucide-react"

import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { HOME_PATH, USE_CASES_PATH, usecasePath } from "@/lib/routes"
import { getUseCasesPagePayload } from "@/lib/useCases/page-cache"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

const PAGE_TITLE = "Use Cases"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Browse Shipyard by use case and discover the products built for your workflow.",
  canonical: USE_CASES_PATH,
})

export default async function UseCasesPage() {
  const {
    useCases,
    highlightUseCases,
    useCaseCount,
    totalProducts,
    averagePerUseCase,
  } = await getUseCasesPagePayload()

  const items: TaxonomyIndexItem[] = useCases.map((useCase, index) => ({
    key: useCase.id,
    title: useCase.label,
    description: `Products selected for ${useCase.label.toLowerCase()} workflows and launch moments.`,
    href: usecasePath(useCase.slug),
    count: useCase.productCount ?? 0,
    icon: <Target className="h-5 w-5" aria-hidden />,
    momentum: 4.6 + (index % 4) * 1.8,
    tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
  }))

  const highlightIds = new Set(highlightUseCases.map((useCase) => useCase.id))
  const trendingItems = items.filter((item) => highlightIds.has(item.key))

  return (
    <TaxonomyIndexPage
      title="Discover use cases built for every launch"
      description="Explore product collections organized around the jobs founders, operators, and teams need to get done."
      searchPlaceholder={`Search ${useCaseCount.toLocaleString()} use cases...`}
      itemsHeading="All Use Cases"
      items={items}
      totalItems={useCaseCount}
      trendingItems={trendingItems}
      pulseTitle="Use Case Pulse"
      pulseStats={[
        { label: "Active use cases", value: useCaseCount.toLocaleString() },
        { label: "Mapped products", value: totalProducts.toLocaleString() },
        {
          label: "Average per use case",
          value: averagePerUseCase.toLocaleString(),
        },
        {
          label: "Top use case",
          value: trendingItems[0]?.title ?? "No use cases yet",
        },
      ]}
      quickLinksTitle="Popular Use Cases"
      emptyTitle="No use cases yet"
      emptyDescription="Once use cases are mapped to products, this directory will populate automatically."
      structuredData={
        <CoreStructuredData
          scriptKeyPrefix="use-cases"
          webPage={{ path: USE_CASES_PATH, name: PAGE_TITLE }}
          breadcrumbs={{
            items: [
              { name: "Home", path: HOME_PATH },
              { name: PAGE_TITLE, path: USE_CASES_PATH },
            ],
          }}
        />
      }
    />
  )
}
