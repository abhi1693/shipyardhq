// app/admin/categories/[id]/page.tsx

import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryById } from "@/controllers/categories"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import PageContainer from "@/components/layout/page-container"

export const metadata: Metadata = {
  title: "View Category",
  description: "View category details",
}

export default async function ViewCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const category = await getCategoryById(params.id)

  if (!category) return notFound()

  return (
    <PageContainer>
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Category Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>ID:</strong> {category.id}
          </div>
          <div>
            <strong>Name:</strong> {category.name}
          </div>
          <div>
            <strong>Slug:</strong> {category.slug}
          </div>
          <div>
            <strong>Created At:</strong>{" "}
            {new Date(category.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Updated At:</strong>{" "}
            {new Date(category.updatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
