import { buttonVariants } from "@/components/atoms/button"
import { Heading } from "@/components/atoms/heading"
import { Separator } from "@/components/atoms/separator"
import PageContainer from "@/components/layout/page-container"
import { cn } from "@/lib/utils"
import { IconPlus } from "@tabler/icons-react"
import { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { DataTableSkeleton } from "@/components/atoms/table/data-table-skeleton"
import UserListPage from "@/components/pages/admin/users/users-list"

export const metadata: Metadata = {
  title: "Users",
  description: "Manage users in the admin panel",
}

export default async function UserPage() {
  return (
    <PageContainer scrollable={false}>
      <div className="flex flex-1 flex-col space-y-4">
        <div className="flex items-start justify-between">
          <Heading
            title="Users"
            description="Manage users in the admin panel"
          />
          <Link
            href="/admin/users/add"
            className={cn(buttonVariants(), "text-xs md:text-sm")}
          >
            <IconPlus className="mr-2 h-4 w-4" /> Add New
          </Link>
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={5} rowCount={8} filterCount={2} />
          }
        >
          <UserListPage />
        </Suspense>
      </div>
    </PageContainer>
  )
}
