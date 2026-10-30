import Link from "next/link"
import { getApprovedLaunchResults } from "@/lib/launch-evidence/catalog"
import { ANALYTICS_METRICS } from "@/lib/analytics/metric-definitions"
import { productPath } from "@/lib/routes"

export function ApprovedLaunchResults() {
  const records = getApprovedLaunchResults()
  if (!records.length) return null
  return (
    <section
      aria-label="Maker launch results"
      className="mx-auto grid max-w-[1200px] gap-4 px-4 py-8 sm:px-6 md:grid-cols-3"
    >
      {records.map((record) => (
        <article
          key={record.productSlug}
          className="rounded-xl border border-[#D7DEE8] bg-white p-6"
        >
          <h2 className="font-bold">
            <Link
              href={productPath(record.productSlug)}
              className="text-[#0051d5] hover:underline"
            >
              {record.productName}
            </Link>
          </h2>
          <p className="mt-2 text-sm text-[#43474c]">
            {record.makerName} · {record.planName}
          </p>
          <p className="mt-4 text-lg font-semibold">
            {record.lifetimeWebsiteClicks.toLocaleString("en-US")} website
            clicks (lifetime)
          </p>
          <p className="mt-2 text-xs leading-5 text-[#475569]">
            As of <time dateTime={record.asOf}>{record.asOf}</time>.{" "}
            {ANALYTICS_METRICS.websiteClicks.description}
          </p>
          <a
            href={record.evidenceUrl}
            className="mt-3 inline-block text-sm text-[#0051d5] underline underline-offset-4"
          >
            Read the launch evidence
          </a>
        </article>
      ))}
    </section>
  )
}
