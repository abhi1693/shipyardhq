"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ObjectHeading } from "@/components/layout/object-view/heading"
import { deleteCategoryAction } from "@/actions/admin/categories/delete/actions"

interface Props {
  id: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  slug?: string | null
  deletable?: boolean
}

export function ClientObjectHeading({
  id,
  title,
  createdAt,
  updatedAt,
  slug,
  deletable,
}: Props) {
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

  return (
    <ObjectHeading
      id={id}
      title={title}
      createdAt={createdAt}
      updatedAt={updatedAt}
      slug={slug}
      onDelete={deletable ? handleDelete : undefined}
    />
  )
}
