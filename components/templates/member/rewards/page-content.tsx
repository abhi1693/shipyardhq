import MemberRewards from "@/components/pages/MemberRewards"
import { getMemberRewardsSnapshot } from "@/actions/member/rewards/actions"
import { Skeleton } from "@/components/atoms/skeleton"

export async function MemberRewardsPageContent() {
  const snapshot = await getMemberRewardsSnapshot()
  return <MemberRewards snapshot={snapshot} />
}

export function MemberRewardsPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-16 pb-8" aria-hidden="true">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={index}
            className="flex min-h-[154px] flex-col justify-between rounded-lg border border-[#E2E8F0] bg-white p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
              <Skeleton className="size-9 rounded-lg" tone="soft" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-9 w-36 rounded-lg" tone="soft" />
              <Skeleton className="h-4 w-48 rounded-full" tone="muted" />
            </div>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-8 space-y-3">
          <Skeleton className="h-10 w-80 max-w-full rounded-lg" tone="soft" />
          <Skeleton
            className="h-5 w-[34rem] max-w-full rounded-full"
            tone="muted"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className="flex min-h-[250px] flex-col rounded-lg border border-[#E2E8F0] bg-white p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <Skeleton className="size-10 rounded-lg" tone="soft" />
                <Skeleton className="h-3 w-20 rounded-full" tone="muted" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
                <Skeleton className="h-5 w-44 rounded-full" tone="soft" />
                <Skeleton className="h-4 w-full rounded-full" tone="muted" />
                <Skeleton className="h-4 w-4/5 rounded-full" tone="muted" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Skeleton className="h-7 w-24 rounded" tone="soft" />
                <Skeleton className="h-7 w-28 rounded" tone="soft" />
              </div>
              <div className="mt-auto pt-5">
                <Skeleton className="h-9 w-full rounded" tone="muted" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] bg-white/70 px-6 py-6 lg:px-8">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56 rounded-lg" tone="soft" />
            <Skeleton
              className="h-4 w-96 max-w-full rounded-full"
              tone="muted"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC]/70">
                {Array.from({ length: 4 }).map((_, index) => (
                  <th
                    key={index}
                    className="border-b border-[#E2E8F0] px-6 py-4 lg:px-8"
                  >
                    <Skeleton className="h-3 w-20 rounded-full" tone="muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 4 }).map((__, columnIndex) => (
                    <td key={columnIndex} className="px-6 py-4 lg:px-8">
                      <Skeleton
                        className={
                          columnIndex === 2
                            ? "h-4 w-72 rounded-full"
                            : columnIndex === 3
                              ? "ml-auto h-4 w-24 rounded-full"
                              : "h-4 w-28 rounded-full"
                        }
                        tone={columnIndex === 1 ? "soft" : "muted"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
