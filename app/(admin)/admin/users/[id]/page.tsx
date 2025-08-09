import { notFound } from "next/navigation"
import { getUserById } from "@/actions/admin/users/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { UserProductRelationship } from "./relationships/products"
import { Prisma } from "@prisma/client"

export default async function ViewUserPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const user = (await getUserById(id, {
    include: {
      products: {
        include: {
          category: true,
        },
      },
    },
  })) as Prisma.UserGetPayload<{
    include: {
      products: {
        include: {
          category: true
        }
      }
    }
  }>

  if (!user) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: user.id,
        title: `${user.firstName} ${user.lastName}`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        slug: user.email,
      }}
      overview={[
        { label: "Email", value: user.email },
        { label: "First Name", value: user.firstName },
        { label: "Last Name", value: user.lastName },
        { label: "Role", value: user.role },
      ]}
      basePath="admin/users"
      deletable
      editable
      relationships={<UserProductRelationship rows={user.products} />}
    />
  )
}
