"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { useFormState, useFormStatus } from "react-dom"
import {
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  Gift,
  type LucideIcon,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react"

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
import { cn } from "@/lib/utils"
import { redeemCatalogItemAction } from "@/actions/member/rewards/actions"
import {
  initialRedeemState,
  type MemberRewardsSnapshot,
  type RedeemFormState,
} from "@/actions/member/rewards/types"
import type {
  RewardFeatureCategory,
  RewardTransactionType,
} from "@/lib/vendor/prisma/client/enums"
import {
  RewardTransactionType as RewardTransactionTypeEnum,
  RewardFeatureCategory as RewardFeatureCategoryEnum,
} from "@/lib/vendor/prisma/client/enums"

type MemberRewardsProps = {
  snapshot: MemberRewardsSnapshot
}

type CatalogItem = MemberRewardsSnapshot["catalog"][number]
type ProductOption = MemberRewardsSnapshot["productOptions"][number]

const categoryLabels: Record<RewardFeatureCategory, string> = {
  [RewardFeatureCategoryEnum.placement]: "Placement",
  [RewardFeatureCategoryEnum.analytics]: "Analytics",
  [RewardFeatureCategoryEnum.insights]: "Insights",
  [RewardFeatureCategoryEnum.access]: "Access",
  [RewardFeatureCategoryEnum.exposure]: "Exposure",
  [RewardFeatureCategoryEnum.utility]: "Utility",
}

const transactionTypeLabels: Record<RewardTransactionType, string> = {
  [RewardTransactionTypeEnum.earn]: "Earned",
  [RewardTransactionTypeEnum.spend]: "Redeemed",
  [RewardTransactionTypeEnum.adjustment]: "Adjusted",
  [RewardTransactionTypeEnum.refund]: "Refunded",
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatRelative(date: Date | null) {
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true })
}

function categoryIconFor(category: RewardFeatureCategory): LucideIcon {
  switch (category) {
    case RewardFeatureCategoryEnum.analytics:
      return ChartNoAxesColumnIncreasing
    case RewardFeatureCategoryEnum.insights:
      return Sparkles
    case RewardFeatureCategoryEnum.access:
      return Star
    case RewardFeatureCategoryEnum.exposure:
      return Trophy
    case RewardFeatureCategoryEnum.utility:
      return Gift
    case RewardFeatureCategoryEnum.placement:
    default:
      return BadgeCheck
  }
}

function transactionAmountDelta(
  transaction: MemberRewardsSnapshot["transactions"][number],
) {
  if (transaction.type === RewardTransactionTypeEnum.earn) {
    return transaction.rewardAmount
  }

  if (transaction.type === RewardTransactionTypeEnum.refund) {
    return transaction.rewardAmount
  }

  if (transaction.type === RewardTransactionTypeEnum.adjustment) {
    return transaction.adjustmentAmount ?? transaction.rewardAmount
  }

  return -transaction.rewardAmount
}

function formatAdjustmentDetail(
  transaction: MemberRewardsSnapshot["transactions"][number],
) {
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

function transactionDetail(
  transaction: MemberRewardsSnapshot["transactions"][number],
) {
  const base =
    transaction.type === RewardTransactionTypeEnum.earn
      ? (transaction.ruleName ?? transaction.ruleKey ?? "Earned")
      : transaction.type === RewardTransactionTypeEnum.adjustment
        ? formatAdjustmentDetail(transaction)
        : transaction.type === RewardTransactionTypeEnum.refund
          ? (transaction.rewardName ?? transaction.rewardKey ?? "Refunded")
          : (transaction.rewardName ?? transaction.rewardKey ?? "Redeemed")

  return transaction.productName ? `${base} - ${transaction.productName}` : base
}

type SummaryMetricProps = {
  label: string
  value: string
  suffix?: string
  icon: LucideIcon
  helper?: string
  compact?: boolean
  valueClassName?: string
}

function SummaryMetric({
  label,
  value,
  suffix,
  icon: Icon,
  helper,
  compact = false,
  valueClassName,
}: SummaryMetricProps) {
  return (
    <article className="flex min-h-[154px] flex-col justify-between rounded-lg border border-[#E2E8F0] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#43474c]">
          {label}
        </p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] text-[#0051d5]">
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              compact
                ? "text-lg font-semibold leading-6"
                : "text-3xl font-bold leading-10",
              "tracking-normal text-[#00162a]",
              valueClassName,
            )}
          >
            {value}
          </span>
          {suffix ? (
            <span className="text-sm font-medium uppercase text-[#43474c]">
              {suffix}
            </span>
          ) : null}
        </div>
        {helper ? (
          <p className="mt-2 text-sm leading-5 text-[#43474c]">{helper}</p>
        ) : null}
      </div>
    </article>
  )
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
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="productId" value={productId ?? ""} />
              <p className="text-xs text-muted-foreground">
                Redemptions attach to a single product for scheduling and
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
  const { balance, catalog, recentRedemptions, transactions, productOptions } =
    snapshot

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)

  const balanceDelta = useMemo(
    () =>
      balance.lifetimeEarned - balance.lifetimeSpent + balance.lifetimeAdjusted,
    [balance.lifetimeEarned, balance.lifetimeSpent, balance.lifetimeAdjusted],
  )

  const hasCatalog = catalog.length > 0
  const latestRedemption = recentRedemptions[0]

  return (
    <div className="mx-auto max-w-[1440px] space-y-16 pb-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Current Balance"
          value={formatNumber(balance.balance)}
          suffix="SHP"
          icon={Star}
          helper={
            balance.lastEarnedAt
              ? `Last earned ${formatRelative(balance.lastEarnedAt)}`
              : "No recent earnings yet"
          }
        />
        <SummaryMetric
          label="Lifetime Earned"
          value={formatNumber(balance.lifetimeEarned)}
          suffix="SHP"
          icon={Trophy}
          helper={`Net ${balanceDelta >= 0 ? "+" : ""}${formatNumber(balanceDelta)} SHP`}
        />
        <SummaryMetric
          label="Current Streak"
          value={formatNumber(balance.currentStreakCount)}
          suffix="Days"
          icon={Sparkles}
          valueClassName="text-[#16a34a]"
          helper={`Longest ${formatNumber(balance.longestStreakCount)} days${balance.currentStreakTier ? ` · ${balance.currentStreakTier}` : ""}`}
        />
        <SummaryMetric
          label="Last Redemption"
          value={latestRedemption?.name ?? "None yet"}
          icon={CheckCircle2}
          compact
          helper={
            latestRedemption
              ? `${formatNumber(latestRedemption.cost)} SHP · ${formatRelative(latestRedemption.createdAt)}`
              : "Redeem a perk to start your ledger"
          }
        />
      </section>

      <section>
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-normal text-[#00162a]">
              Available Rewards
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-[#43474c]">
              Invest your Shipyard points into placements, visibility, and
              product growth.
            </p>
          </div>
        </div>

        {hasCatalog ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => {
              const Icon = categoryIconFor(item.category)

              return (
                <article
                  key={item.featureKey}
                  className={cn(
                    "flex min-h-[250px] flex-col rounded-lg border bg-white p-6 transition-colors hover:border-[#0051d5]",
                    item.canRedeem
                      ? "border-[#E2E8F0]"
                      : "border-[#E2E8F0] opacity-65",
                  )}
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#eff4ff] text-[#0051d5]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#0b1c30]">
                      {formatNumber(item.baseCost)} SHP
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#43474c]">
                      {categoryLabels[item.category]}
                    </p>
                    <h2 className="text-lg font-semibold tracking-normal text-[#00162a]">
                      {item.name}
                    </h2>
                    <p className="text-sm leading-5 text-[#43474c]">
                      {item.description ??
                        "Redeem to activate this capability."}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#43474c]">
                    <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
                      Active {item.activeCount}
                      {item.maxActivePerUser != null
                        ? ` / ${item.maxActivePerUser}`
                        : ""}
                    </span>
                    {item.maxPendingPerUser != null ? (
                      <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
                        Pending {item.pendingCount} / {item.maxPendingPerUser}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto pt-5">
                    <button
                      type="button"
                      disabled={!item.canRedeem}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "w-full cursor-pointer rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all disabled:cursor-not-allowed",
                        item.canRedeem
                          ? "border-[#00162a] text-[#00162a] hover:bg-[#00162a] hover:text-white"
                          : "border-[#E2E8F0] text-[#43474c]",
                      )}
                    >
                      {item.canRedeem ? "Redeem" : "Unavailable"}
                    </button>
                    {!item.canRedeem && item.reasons.length ? (
                      <p className="mt-2 text-xs leading-4 text-[#ba1a1a]">
                        {item.reasons.join(" • ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-sm text-[#43474c]">
            No rewards are configured yet. Check back soon for placements and
            analytics boosts.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] bg-white/70 px-6 py-6 lg:px-8">
          <div>
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-[#00162a]">
                Rewards Activity
              </h2>
              <p className="mt-2 text-sm leading-5 text-[#43474c]">
                Your transparent digital ledger for reward earnings and
                redemptions.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {transactions.length ? (
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F8FAFC]/70">
                  <th className="border-b border-[#E2E8F0] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#43474c] lg:px-8">
                    When
                  </th>
                  <th className="border-b border-[#E2E8F0] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#43474c] lg:px-8">
                    Type
                  </th>
                  <th className="border-b border-[#E2E8F0] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#43474c] lg:px-8">
                    Detail
                  </th>
                  <th className="border-b border-[#E2E8F0] px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.14em] text-[#43474c] lg:px-8">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/70">
                {transactions.map((transaction) => {
                  const delta = transactionAmountDelta(transaction)
                  const isPositive = delta >= 0
                  const typeLabel = transactionTypeLabels[transaction.type]

                  return (
                    <tr
                      key={transaction.id}
                      className="transition-colors hover:bg-[#eff4ff]/35"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#43474c] lg:px-8">
                        {formatRelative(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 lg:px-8">
                        <span
                          className={cn(
                            "rounded px-3 py-1 text-xs font-bold uppercase tracking-[0.1em]",
                            isPositive
                              ? "bg-[#16a34a]/10 text-[#16a34a]"
                              : "bg-[#0051d5]/10 text-[#0051d5]",
                          )}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#43474c] lg:px-8">
                        {transactionDetail(transaction)}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-6 py-4 text-right text-sm font-semibold lg:px-8",
                          isPositive ? "text-[#16a34a]" : "text-[#ba1a1a]",
                        )}
                      >
                        {isPositive ? "+" : "-"}
                        {formatNumber(Math.abs(delta))} SHP
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-[#43474c] lg:p-8">
              Transactions will appear here as you earn and spend rewards.
            </p>
          )}
        </div>
      </section>

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
