"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { useFormState, useFormStatus } from "react-dom"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Label } from "@/components/atoms/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import { cn } from "@/lib/utils"
import { redeemCatalogItemAction } from "@/actions/member/rewards/actions"
import {
  initialRedeemState,
  type MemberRewardsSnapshot,
  type RedeemFormState,
} from "@/actions/member/rewards/types"
import {
  FeatureEntitlementStatus,
  RewardTransactionType,
  RedemptionStatus,
  RewardFeatureCategory,
} from "@/lib/vendor/prisma/client"
import {
  MEMBER_PRODUCTS_PATH,
  REWARDS_PATH,
  memberProductPath,
} from "@/lib/routes"

type MemberRewardsProps = {
  snapshot: MemberRewardsSnapshot
}

type CatalogItem = MemberRewardsSnapshot["catalog"][number]
type ProductOption = MemberRewardsSnapshot["productOptions"][number]

const categoryLabels: Record<RewardFeatureCategory, string> = {
  [RewardFeatureCategory.placement]: "Placement",
  [RewardFeatureCategory.analytics]: "Analytics",
  [RewardFeatureCategory.insights]: "Insights",
  [RewardFeatureCategory.access]: "Access",
  [RewardFeatureCategory.exposure]: "Exposure",
  [RewardFeatureCategory.utility]: "Utility",
}

const transactionTypeLabels: Record<RewardTransactionType, string> = {
  [RewardTransactionType.earn]: "Earned",
  [RewardTransactionType.spend]: "Redeemed",
  [RewardTransactionType.adjustment]: "Adjusted",
  [RewardTransactionType.refund]: "Refunded",
}

const entitlementStatusTone: Record<FeatureEntitlementStatus, string> = {
  [FeatureEntitlementStatus.active]: "text-emerald-600",
  [FeatureEntitlementStatus.pending]: "text-amber-600",
  [FeatureEntitlementStatus.paused]: "text-slate-500",
  [FeatureEntitlementStatus.expired]: "text-slate-400",
  [FeatureEntitlementStatus.canceled]: "text-slate-500",
  [FeatureEntitlementStatus.failed]: "text-rose-600",
}

const redemptionStatusTone: Record<RedemptionStatus, string> = {
  [RedemptionStatus.pending]: "text-amber-600",
  [RedemptionStatus.active]: "text-emerald-600",
  [RedemptionStatus.expired]: "text-slate-400",
  [RedemptionStatus.canceled]: "text-slate-500",
  [RedemptionStatus.failed]: "text-rose-600",
  [RedemptionStatus.refunded]: "text-emerald-600",
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatRelative(date: Date | null) {
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatDateTime(date: Date | null) {
  if (!date) return "—"
  return format(date, "MMM d, yyyy • h:mm a")
}

function RedeemSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="w-full sm:w-auto"
    >
      {pending ? "Redeeming…" : "Redeem reward"}
    </Button>
  )
}

type RedeemDialogProps = {
  item: CatalogItem
  productOptions: ProductOption[]
  onClose: () => void
}

function RedeemDialog({ item, productOptions, onClose }: RedeemDialogProps) {
  const [formState, formAction] = useFormState<RedeemFormState, FormData>(
    redeemCatalogItemAction,
    initialRedeemState,
  )

  const requiresProduct = item.requiresProduct
  const requiresSchedule = item.requiresSchedule

  const [productId, setProductId] = useState<string | undefined>(undefined)

  const defaultSlotKey = useMemo(
    () => `${item.featureKey}:default`,
    [item.featureKey],
  )

  useEffect(() => {
    if (formState.status === "success") {
      toast.success(formState.message ?? "Reward redeemed")
      onClose()
    } else if (formState.status === "error" && formState.message) {
      toast.error(formState.message)
    }
  }, [formState, onClose])

  const productPlaceholder = useMemo(() => {
    if (!requiresProduct) return "Optional"
    return productOptions.length ? "Select a product" : "No eligible products"
  }, [productOptions.length, requiresProduct])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Redeem {item.name}</DialogTitle>
          <DialogDescription>
            Spend {formatNumber(item.baseCost)} rewards to unlock this perk.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="featureKey" value={item.featureKey} />
          {requiresSchedule ? (
            <input type="hidden" name="slotKey" value={defaultSlotKey} />
          ) : null}
          <div className="space-y-2">
            <Label>Reward details</Label>
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
              <p>{item.description ?? "Redeem to enable this capability."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="bg-white">
                  {categoryLabels[item.category]}
                </Badge>
                <span>{formatNumber(item.baseCost)} rewards</span>
                {item.durationSeconds ? (
                  <span>
                    {Math.round(item.durationSeconds / 3600)}h duration
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {requiresProduct ? (
            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <Select
                value={productId ?? undefined}
                onValueChange={setProductId}
                disabled={!productOptions.length}
              >
                <SelectTrigger
                  className="w-full justify-between"
                  data-testid="redeem-product-select"
                >
                  <SelectValue placeholder={productPlaceholder} />
                </SelectTrigger>
                <SelectContent className="w-full min-w-[16rem]">
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.organizationName
                        ? `${product.name} • ${product.organizationName}`
                        : product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="productId" value={productId ?? ""} />
              <p className="text-xs text-muted-foreground">
                Redeemments attach to a single product for scheduling and
                auditing.
              </p>
            </div>
          ) : (
            <input type="hidden" name="productId" value="" />
          )}

          <DialogFooter>
            <RedeemSubmitButton disabled={requiresProduct && !productId} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MemberRewards({ snapshot }: MemberRewardsProps) {
  const {
    balance,
    catalog,
    activeEntitlements,
    recentRedemptions,
    transactions,
    productOptions,
  } = snapshot

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)

  const balanceDelta = useMemo(
    () =>
      balance.lifetimeEarned - balance.lifetimeSpent + balance.lifetimeAdjusted,
    [balance.lifetimeEarned, balance.lifetimeSpent, balance.lifetimeAdjusted],
  )

  const hasCatalog = catalog.length > 0

  const formatAdjustmentDetail = (
    transaction: MemberRewardsSnapshot["transactions"][number],
  ) => {
    if (transaction.notes && transaction.notes.length) {
      return transaction.notes
    }
    const amount = transaction.adjustmentAmount
    if (typeof amount === "number" && Number.isFinite(amount)) {
      const tone = amount >= 0 ? "Admin credit" : "Admin deduction"
      const formattedAmount = formatNumber(Math.abs(amount))
      const sign = amount >= 0 ? "+" : "-"
      return `${tone} (${sign}${formattedAmount} rewards)`
    }
    return "Admin adjustment"
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Current balance</CardTitle>
            <CardDescription>Your available Shipyard rewards.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight text-slate-900">
              {formatNumber(balance.balance)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {balance.lastEarnedAt
                ? `Last earned ${formatRelative(balance.lastEarnedAt)}`
                : "Earn rewards by engaging with the community."}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={REWARDS_PATH}>Earn more rewards</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Lifetime</CardTitle>
            <CardDescription>Total earned vs redeemed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Earned</span>
              <span className="font-medium text-slate-900">
                {formatNumber(balance.lifetimeEarned)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Redeemed</span>
              <span className="font-medium text-slate-900">
                {formatNumber(balance.lifetimeSpent)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Admin adjustments</span>
              <span
                className={cn(
                  "font-medium",
                  balance.lifetimeAdjusted === 0
                    ? "text-slate-900"
                    : balance.lifetimeAdjusted > 0
                      ? "text-emerald-600"
                      : "text-rose-600",
                )}
              >
                {balance.lifetimeAdjusted >= 0 ? "+" : ""}
                {formatNumber(balance.lifetimeAdjusted)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                Net (incl. adjustments)
              </span>
              <span
                className={cn(
                  "font-semibold",
                  balanceDelta >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {balanceDelta >= 0 ? "+" : ""}
                {formatNumber(balanceDelta)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Streak</CardTitle>
            <CardDescription>Keep momentum to earn bonuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold text-slate-900">
              {balance.currentStreakCount} days
            </div>
            <p className="text-sm text-muted-foreground">
              Longest streak {formatNumber(balance.longestStreakCount)} days.
              {balance.currentStreakTier
                ? ` Tier: ${balance.currentStreakTier}.`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {balance.streakActiveThrough
                ? `Active through ${formatDateTime(balance.streakActiveThrough)}`
                : "Kickstart a streak with a login or review."}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Recent redemption</CardTitle>
            <CardDescription>Latest spend from your ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRedemptions.length ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-slate-900">
                  {recentRedemptions[0].name}
                </p>
                <p className="text-muted-foreground">
                  {formatRelative(recentRedemptions[0].createdAt)} ·{" "}
                  {formatNumber(recentRedemptions[0].cost)} rewards
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Redeem rewards to activate placements or analytics boosts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Active perks</CardTitle>
            <CardDescription>
              Everything currently running on your products.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEntitlements.length ? (
              activeEntitlements.map((entitlement) => (
                <div
                  key={entitlement.id}
                  className="flex flex-col rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        {entitlement.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entitlement.productSlug ? (
                          <Link
                            href={memberProductPath(entitlement.productSlug)}
                            className="text-sky-600 hover:underline"
                          >
                            {entitlement.productName}
                          </Link>
                        ) : (
                          (entitlement.productName ?? "Account-wide")
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        entitlementStatusTone[entitlement.status],
                      )}
                    >
                      {entitlement.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Starts {formatDateTime(entitlement.startsAt)}</span>
                    <span>Ends {formatDateTime(entitlement.expiresAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No active entitlements yet. Redeem a reward to see it tracked
                here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle>Recent redemptions</CardTitle>
            <CardDescription>
              Ledger of your latest spend events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRedemptions.length ? (
              recentRedemptions.slice(0, 5).map((redemption) => (
                <div
                  key={redemption.id}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {redemption.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(redemption.createdAt)} ·{" "}
                        {formatNumber(redemption.cost)} rewards
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        redemptionStatusTone[redemption.status],
                      )}
                    >
                      {redemption.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {redemption.productSlug ? (
                      <Link
                        href={memberProductPath(redemption.productSlug)}
                        className="text-sky-600 hover:underline"
                      >
                        {redemption.productName}
                      </Link>
                    ) : (
                      (redemption.productName ?? "Account-wide")
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                When you redeem rewards, the ledger shows the status and
                assigned product here.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={MEMBER_PRODUCTS_PATH}>Manage products</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="bg-white/95">
        <CardHeader>
          <CardTitle>Available rewards</CardTitle>
          <CardDescription>
            Redeem rewards for placements, analytics upgrades, and unlocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCatalog ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalog.map((item) => (
                <div
                  key={item.featureKey}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[item.category]}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-slate-50">
                        {formatNumber(item.baseCost)} rewards
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.description ??
                        "Redeem to activate this capability."}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div>
                      Active: {item.activeCount}
                      {item.maxActivePerUser != null
                        ? ` / ${item.maxActivePerUser}`
                        : ""}
                    </div>
                    {item.maxPendingPerUser != null ? (
                      <div>
                        Pending: {item.pendingCount} / {item.maxPendingPerUser}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto pt-4">
                    <Button
                      className="w-full"
                      disabled={!item.canRedeem}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.canRedeem ? "Redeem" : "Unavailable"}
                    </Button>
                    {!item.canRedeem && item.reasons.length ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {item.reasons.join(" • ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No rewards are configured yet. Check back soon for placements and
              analytics boosts.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader>
          <CardTitle>Rewards activity</CardTitle>
          <CardDescription>
            Recent reward transactions from your ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {transactions.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Rewards</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatRelative(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {transactionTypeLabels[transaction.type]}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {transaction.type === RewardTransactionType.earn
                        ? (transaction.ruleName ??
                          transaction.ruleKey ??
                          "Earned")
                        : transaction.type === RewardTransactionType.adjustment
                          ? formatAdjustmentDetail(transaction)
                          : transaction.type === RewardTransactionType.refund
                            ? (transaction.rewardName ??
                              transaction.rewardKey ??
                              "Refunded")
                            : (transaction.rewardName ??
                              transaction.rewardKey ??
                              "Redeemed")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm font-semibold",
                        (() => {
                          if (transaction.type === RewardTransactionType.earn)
                            return "text-emerald-600"
                          if (transaction.type === RewardTransactionType.refund)
                            return "text-emerald-600"
                          if (
                            transaction.type ===
                            RewardTransactionType.adjustment
                          ) {
                            const delta =
                              transaction.adjustmentAmount ??
                              transaction.rewardAmount
                            return delta >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                          return "text-rose-600"
                        })(),
                      )}
                    >
                      {(() => {
                        if (transaction.type === RewardTransactionType.earn)
                          return "+"
                        if (transaction.type === RewardTransactionType.refund)
                          return "+"
                        if (
                          transaction.type === RewardTransactionType.adjustment
                        ) {
                          const delta =
                            transaction.adjustmentAmount ??
                            transaction.rewardAmount
                          return delta >= 0 ? "+" : "-"
                        }
                        return "-"
                      })()}
                      {formatNumber(transaction.rewardAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNumber(transaction.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Transactions will appear here as you earn and spend rewards.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedItem ? (
        <RedeemDialog
          item={selectedItem}
          productOptions={productOptions}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </div>
  )
}
