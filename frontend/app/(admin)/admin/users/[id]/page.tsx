import { notFound } from "next/navigation"

import { getUserById } from "@/actions/admin/users/actions"
import {
  getRewardTransactions,
  getRewardTransactionsCount,
} from "@/actions/admin/rewards/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { UserProductRelationship } from "./relationships/products"
import { UserProductUpvoteRelationship } from "./relationships/upvotes"
import { UserFeedbackRelationship } from "./relationships/feedback"
import { UserPlanPurchasesRelationship } from "./relationships/purchases"
import {
  UserRewardsRelationship,
  type UserRewardTransactionRow,
} from "./relationships/rewards"
import { Prisma } from "@/lib/vendor/prisma/client"
import UserStatusMenu from "@/components/molecules/UserStatusMenu"
import { Badge } from "@/components/atoms/badge"
import { formatDate, placeholder } from "@/lib/ui/formatters"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

const userInclude = {
  products: {
    include: {
      category: true,
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
} satisfies Prisma.UserInclude

type UserWithRelationships = Prisma.UserGetPayload<{
  include: typeof userInclude
}>

type RewardTransactionWithRelationships = Prisma.RewardTransactionGetPayload<{
  include: {
    user: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
      }
    }
    rule: {
      select: {
        id: true
        key: true
        name: true
      }
    }
    catalogItem: {
      select: {
        featureKey: true
        name: true
      }
    }
    redemption: {
      select: {
        id: true
        status: true
        featureKey: true
      }
    }
  }
}>

export default async function ViewUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<PaginationSearchParams>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { skip, take, pageSize } = resolvePagination(resolvedSearchParams)

  const userPromise = getUserById(id, {
    include: userInclude,
  }) as Promise<UserWithRelationships | null>

  const rewardTransactionsPromise = getRewardTransactions({
    skip,
    take,
    userId: id,
  }) as Promise<RewardTransactionWithRelationships[]>

  const [user, rewardTransactions, rewardTransactionsTotal] = await Promise.all(
    [
      userPromise,
      rewardTransactionsPromise,
      getRewardTransactionsCount("all", id),
    ],
  )

  if (!user) return notFound()

  const rewardTransactionRows: UserRewardTransactionRow[] =
    rewardTransactions.map(
      (transaction: (typeof rewardTransactions)[number]) => ({
        id: transaction.id,
        type: transaction.type,
        rewardAmount: transaction.rewardAmount,
        balanceAfter: transaction.balanceAfter,
        notes: transaction.notes,
        eventId: transaction.eventId,
        createdAt: transaction.createdAt,
        rule: transaction.rule
          ? {
              id: transaction.rule.id,
              key: transaction.rule.key,
              name: transaction.rule.name,
            }
          : null,
        catalogItem: transaction.catalogItem
          ? {
              featureKey: transaction.catalogItem.featureKey,
              name: transaction.catalogItem.name,
            }
          : null,
        redemption: transaction.redemption
          ? {
              id: transaction.redemption.id,
              status: transaction.redemption.status,
              featureKey: transaction.redemption.featureKey,
            }
          : null,
      }),
    )

  const rewardTransactionPageCount = Math.max(
    Math.ceil(rewardTransactionsTotal / pageSize),
    1,
  )

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
          <UserProductUpvoteRelationship rows={user.ProductUpvote} />
          <UserPlanPurchasesRelationship rows={user.purchases} />
          <UserRewardsRelationship
            rows={rewardTransactionRows}
            pageCount={rewardTransactionPageCount}
          />
          <UserFeedbackRelationship rows={user.feedback} />
        </>
      }
    />
  )
}
