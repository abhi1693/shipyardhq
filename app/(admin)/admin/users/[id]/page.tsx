import { notFound } from "next/navigation"
import { getUserById } from "@/actions/admin/users/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { UserProductRelationship } from "./relationships/products"
import { UserMembershipRelationship } from "./relationships/memberships"
import { UserOwnedOrganizationsRelationship } from "./relationships/owned-organizations"
import { UserProductUpvoteRelationship } from "./relationships/upvotes"
import { UserFeedbackRelationship } from "./relationships/feedback"
import { UserPlanPurchasesRelationship } from "./relationships/purchases"
import { Prisma } from "@/lib/vendor/prisma/client"
import UserStatusMenu from "@/components/molecules/UserStatusMenu"
import { Badge } from "@/components/atoms/badge"
import { formatDate, placeholder } from "@/lib/ui/formatters"

export default async function ViewUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = (await getUserById(id, {
    include: {
      products: {
        include: {
          category: true,
        },
      },
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      Organization: {
        orderBy: {
          createdAt: "desc",
        },
      },
      ProductUpvote: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      feedback: {
        orderBy: {
          createdAt: "desc",
        },
      },
      purchases: {
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })) as Prisma.UserGetPayload<{
    include: {
      products: {
        include: {
          category: true
        }
      },
      memberships: {
        include: {
          organization: true
        }
      },
      Organization: true,
      ProductUpvote: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      feedback: true,
      purchases: {
        include: {
          plan: true
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
      headingActionsLeft={
        <UserStatusMenu
          userId={user.id}
          clerkId={user.clerkId}
          status={user.status}
        />
      }
      overview={[
        { label: "Email", value: user.email },
        { label: "First Name", value: user.firstName },
        { label: "Last Name", value: user.lastName },
        { label: "Clerk ID", value: user.clerkId },
        { label: "Role", value: user.role },
        {
          label: "Role Intent",
          value: user.roleIntent ?? placeholder(),
        },
        {
          label: "Heard From",
          value: user.heardFrom ?? placeholder(),
        },
        {
          label: "Status",
          value: (
            <Badge
              variant={
                user.status === "active"
                  ? "success"
                  : user.status === "terminated"
                    ? "destructive"
                    : "secondary"
              }
            >
              {user.status}
            </Badge>
          ),
        },
        {
          label: "Suspended At",
          value: user.suspendedAt
            ? formatDate(user.suspendedAt)
            : placeholder(),
        },
        {
          label: "Terminated At",
          value: user.terminatedAt
            ? formatDate(user.terminatedAt)
            : placeholder(),
        },
      ]}
      basePath="admin/users"
      deletable
      editable
      relationships={
        <>
          <UserProductRelationship rows={user.products} />
          <UserMembershipRelationship rows={user.memberships} />
          <UserOwnedOrganizationsRelationship rows={user.Organization} />
          <UserProductUpvoteRelationship rows={user.ProductUpvote} />
          <UserPlanPurchasesRelationship rows={user.purchases} />
          <UserFeedbackRelationship rows={user.feedback} />
        </>
      }
    />
  )
}
