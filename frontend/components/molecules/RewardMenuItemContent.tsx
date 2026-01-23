"use client"

import { Sparkles } from "lucide-react"

const numberFormatter = new Intl.NumberFormat("en-US")

type RewardMenuItemContentProps = {
  balance: number
}

export function RewardMenuItemContent({ balance }: RewardMenuItemContentProps) {
  const formattedBalance = numberFormatter.format(balance)

  return (
    <span className="flex w-full items-center gap-2 text-sm font-medium text-foreground">
      <Sparkles className="h-4 w-4" />
      Rewards
      <span className="ml-auto text-xs uppercase tracking-wide text-muted-foreground">
        {formattedBalance}
      </span>
    </span>
  )
}
