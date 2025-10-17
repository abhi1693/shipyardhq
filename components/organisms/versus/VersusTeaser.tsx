import Link from "next/link"
import { ChevronsUp } from "lucide-react"
import type { VersusProduct } from "@/actions/public/products/versus"
import { Button } from "@/components/atoms/button"
import {
  VersusCard,
  VersusDivider,
} from "@/components/molecules/versus/VersusCard"
import { VERSUS_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

interface VersusTeaserProps {
  matchup: VersusProduct[]
}

export function VersusTeaser({ matchup }: VersusTeaserProps) {
  const [featured, challenger] = matchup

  if (!featured) {
    return null
  }

  const upvoteLabel = `${featured.upvotes.toLocaleString()} upvotes`

  return (
    <section className="rounded-3xl border border-border/70 bg-white px-6 py-6 shadow-[0_28px_90px_-70px_rgba(7,58,104,0.55)] md:px-8 md:py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
          VS Arena preview
        </p>
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
          See who&apos;s heating up in the arena
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          Catch a glimpse of the current contender, then enter the arena to pick
          their challenger and push a launch up the board.
        </p>
      </header>
      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-border/60 bg-white/95 px-6 py-6 shadow-[0_28px_90px_-70px_rgba(7,58,104,0.45)] md:px-8 md:py-8">
        <div className="relative z-10 flex flex-col items-center gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-8">
          <VersusCard
            product={featured}
            side="left"
            action={({ className }) => (
              <span
                className={cn(
                  className,
                  "inline-flex items-center gap-2 rounded-full bg-white/95",
                )}
                aria-label={upvoteLabel}
                title={upvoteLabel}
              >
                <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                <span className="text-base font-semibold leading-none">
                  {featured.upvotes.toLocaleString()}
                </span>
              </span>
            )}
          />
          <VersusDivider />
          <div className="flex h-full w-full max-w-[24rem] flex-col justify-between gap-4 rounded-2xl border border-dashed border-border/60 bg-white/85 p-6 text-center shadow-[0_28px_80px_-68px_rgba(7,58,104,0.32)] md:mx-auto md:max-w-[24rem] md:justify-center md:text-left">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">
                Play the full battle
              </h3>
              <p className="text-sm text-muted-foreground md:text-base">
                {challenger
                  ? `${featured.name} is eyeing a showdown with ${challenger.name}. Step into the arena to call the winner.`
                  : `${featured.name} is waiting for a challenger. Step into the arena to spin the matchup and decide who advances.`}
              </p>
            </div>
            <Button asChild size="lg">
              <Link href={VERSUS_PATH}>Play the full battle</Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_16%_-20%,rgba(24,96,168,0.14),transparent_65%),radial-gradient(circle_at_88%_120%,rgba(155,93,229,0.18),transparent_70%)]"
        />
      </div>
    </section>
  )
}

export default VersusTeaser
