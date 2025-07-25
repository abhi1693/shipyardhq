"use client"

import { ObjectHeading } from "@/components/layout/object-view/heading"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { deleteCategoryAction } from "@/actions/admin/categories/delete/actions"

interface ClientObjectHeadingProps {
  id: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  slug?: string | null
  deletable?: boolean
  editable?: boolean
}

export function ClientObjectHeading({
  id,
  title,
  createdAt,
  updatedAt,
  slug,
  deletable,
  editable,
}: ClientObjectHeadingProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCategoryAction(id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Category deleted")
        router.push("/admin/categories")
      }
    })
  }

  const handleEdit = () => {
    router.push(`/admin/categories/${id}/edit`)
  }

  return (
    <ObjectHeading
      id={id}
      title={title}
      createdAt={createdAt}
      updatedAt={updatedAt}
      slug={slug}
      onDelete={deletable ? handleDelete : undefined}
      onEdit={editable ? handleEdit : undefined}
    />
  )
}
