import { CardSkeleton } from "@/components/atoms/card.skeleton"
import DirectoryHeaderSkeleton from "@/components/organisms/directory/DirectoryHeader.skeleton"

export function RewardsLeaderboardSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeaderSkeleton />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-8">
              <CardSkeleton
                tone="soft"
                radius="lg"
                lines={6}
                className="border border-border bg-white"
              />
              <CardSkeleton
                tone="soft"
                radius="lg"
                lines={10}
                showFooter
                className="border border-border bg-white"
              />
            </div>
            <aside className="flex flex-col gap-6">
              <CardSkeleton
                tone="soft"
                radius="lg"
                lines={5}
                showFooter
                className="border border-border bg-white"
              />
              <CardSkeleton
                tone="soft"
                radius="lg"
                lines={4}
                className="border border-border bg-white"
              />
              <CardSkeleton
                tone="soft"
                radius="lg"
                lines={4}
                className="border border-border bg-white"
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
