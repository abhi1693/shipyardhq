import { buttonVariants } from "@/components/atoms/button"
import { Heading } from "@/components/atoms/heading"
import { Separator } from "@/components/atoms/separator"
import PageContainer from "@/components/layout/page-container"
import { cn } from "@/lib/utils"
import { IconPlus } from "@tabler/icons-react"
import Link from "next/link"
import { Suspense, ReactNode } from "react"
import { DataTableSkeleton } from "@/components/atoms/table/data-table-skeleton"

interface ListPageWrapperProps {
  title: string
  description?: string
  addLink?: string
  children: ReactNode
}

export default function ListPageWrapper({
  title,
  description,
  addLink,
  children,
}: ListPageWrapperProps) {
  description =
    description || `Manage ${title.toLowerCase()} in the admin panel`

  return (
    <PageContainer scrollable={false}>
      <div className="flex flex-1 flex-col space-y-4">
        <div className="flex items-start justify-between">
          <Heading title={title} description={description} />
          {addLink && (
            <Link
              href={addLink}
              className={cn(buttonVariants(), "text-xs md:text-sm")}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Add New
            </Link>
          )}
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={5} rowCount={8} filterCount={2} />
          }
        >
          {children}
        </Suspense>
      </div>
    </PageContainer>
  )
}
