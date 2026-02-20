import { ClaimProductsClient } from "@/components/pages/ClaimProductsClient"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

type SearchParams = Record<string, string | string[] | undefined>

function toParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export async function ClaimProductsPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const qParam = toParamString(params?.q)
  const q = qParam?.trim()
  const initialSelectedId = toParamString(params?.productId)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Verification
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Claim products
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Select a listing you own, lock it via DNS, then confirm via email.
          Ownership moves to your org after both steps.
        </p>
      </div>

      <ClaimProductsClient
        initialQuery={q ?? ""}
        initialSelectedId={initialSelectedId ?? null}
      />
    </div>
  )
}

export function ClaimProductsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <HeadingSkeleton lines={2} />
        <Skeleton className="h-3 w-80 rounded-full" tone="muted" />
      </div>
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={8}
        showFooter={false}
        className="border border-slate-200/80 bg-white/95"
      />
    </div>
  )
}
