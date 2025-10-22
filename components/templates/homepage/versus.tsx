import { getVersusMatchup } from "@/actions/public/products/versus"
import { VersusTeaser } from "@/components/organisms/versus/VersusTeaser"
import { Skeleton } from "@/components/atoms/skeleton"

export async function VersusTeaserSection() {
  const matchup = await getVersusMatchup()
  return <VersusTeaser matchup={matchup} />
}

export function VersusTeaserSkeleton() {
  return (
    <section className="rounded-3xl border border-border/70 bg-white px-6 py-6 shadow-[0_28px_90px_-70px_rgba(7,58,104,0.55)] md:px-8 md:py-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-6 h-60 w-full rounded-[1.5rem]" />
    </section>
  )
}
