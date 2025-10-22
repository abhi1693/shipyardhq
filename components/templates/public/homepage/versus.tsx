import { getVersusMatchup } from "@/actions/public/products/versus"
import { VersusTeaser } from "@/components/organisms/versus/VersusTeaser"
import VersusTeaserSkeletonSection from "@/components/organisms/versus/VersusTeaser.skeleton"

export async function VersusTeaserSection() {
  const matchup = await getVersusMatchup()
  return <VersusTeaser matchup={matchup} />
}

export function VersusTeaserSkeleton() {
  return <VersusTeaserSkeletonSection />
}
