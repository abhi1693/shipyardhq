"use client"

import AddProductWizard from "@/components/pages/products/AddProductWizard"

export default function AddProductForm({
  categories,
  organizations,
  users,
}: {
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
  users: { id: string; email: string; clerkId: string }[]
}) {
  return (
    <AddProductWizard
      mode="admin"
      categories={categories}
      organizations={organizations}
      users={users}
    />
  )
}

