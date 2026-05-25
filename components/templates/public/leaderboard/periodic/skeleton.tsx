import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import DirectoryProductListSkeleton from "@/components/organisms/directory/DirectoryProductList.skeleton"
import { DirectoryHighlightsSidebarSkeleton } from "@/components/templates/public/homepage/directory-highlights"

export function PeriodicLeaderboardSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-16 pt-10"
        mainClassName="gap-6"
        sidebarClassName="gap-6"
        main={
          <>
            <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-7 w-64 rounded-full" tone="muted" />
                  <Skeleton className="h-3 w-44 rounded-full" tone="soft" />
                </div>
                <div className="flex rounded-full border border-border/70 bg-white p-0.5 shadow-sm">
                  <ButtonSkeleton size="sm" labelWidth="3.5rem" />
                  <ButtonSkeleton
                    size="sm"
                    variant="outline"
                    labelWidth="4rem"
                  />
                  <ButtonSkeleton
                    size="sm"
                    variant="outline"
                    labelWidth="4.5rem"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-8 rounded-full border border-border/70"
                    tone="soft"
                  />
                ))}
              </div>
            </section>
            <DirectoryProductListSkeleton count={9} showMetaBadge />
          </>
        }
        sidebar={
          <>
            <CardSkeleton
              tone="soft"
              radius="lg"
              lines={5}
              className="border border-border/80 bg-white/95"
            />
            <DirectoryHighlightsSidebarSkeleton />
          </>
        }
      />
    </main>
  )
}
