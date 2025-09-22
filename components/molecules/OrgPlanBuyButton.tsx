"use client"

import { useUser } from "@clerk/nextjs"
import { CheckoutButton } from "@/components/molecules/CheckoutButton"
import { MEMBER_ORGANIZATIONS_PATH } from "@/lib/routes"

export function OrgPlanBuyButton({ externalId }: { externalId: string }) {
  const { user } = useUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined
  return (
    <CheckoutButton
      productId={externalId}
      email={email || undefined}
      name={name}
      label="Buy Now"
      redirectPath={MEMBER_ORGANIZATIONS_PATH}
      disabled={!email}
    />
  )
}
