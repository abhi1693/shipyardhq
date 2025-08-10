"use client"

import { ObjectHeading } from "@/components/layout/object-view/heading"
import { useRouter } from "next/navigation"

export interface ClientObjectHeadingProps {
  id: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  slug?: string | null
  deletable?: boolean
  editable?: boolean
  basePath: string
  extraActions?: React.ReactNode
}

export function ClientObjectHeading({
  id,
  title,
  createdAt,
  updatedAt,
  slug,
  deletable,
  editable,
  basePath,
  extraActions,
}: ClientObjectHeadingProps) {
  const router = useRouter()

  const handleDelete = () => {
    router.push(`/${basePath}/${id}/delete`)
  }

  const handleEdit = () => {
    router.push(`/${basePath}/${id}/edit`)
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
      extraActions={extraActions}
    />
  )
}
