import Link from "next/link"
import { getPublicPlans, type PublicPlan } from "@/actions/public/plans/actions"
import { Button } from "@/components/atoms/button"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getReviewedLaunchChannels } from "@/lib/launch-channels/catalog"
import {
  formatPricingOfferPrice,
  getDiscountedPriceCents,
  getPricingOfferPresentation,
  selectPricingOfferPlans,
} from "@/lib/pricing/offer"
import { MEMBER_PRODUCTS_ADD_PATH, PRICING_PATH } from "@/lib/routes"

export function LaunchChannelComparisonContent({
  plans,
}: {
  plans: PublicPlan[]
}) {
  const channels = getReviewedLaunchChannels()
  const visiblePlans = selectPricingOfferPlans(plans, "one_time_price")
  return (
    <div className="space-y-8 text-[#0b1c30]">
      <div className="max-w-3xl space-y-3 text-sm leading-6 text-[#43474c]">
        <p>
          We selected platforms with a public product or startup submission flow
          and primary sources a founder can check. This is a small editorial
          comparison, not a ranked list of every launch site.
        </p>
        <p>
          Shipyard publishes this comparison and sells optional promotion. Maker
          mappings, votes, and sponsorship do not select these channels or their
          order. Fit depends on your product and launch goals; no channel here
          guarantees customers, search rankings, or a traffic volume.
        </p>
      </div>
      <article className="rounded-xl border border-[#D7DEE8] bg-white p-6 sm:p-8">
        <h3 className="text-xl font-bold text-black">Shipyard HQ</h3>
        <p className="mt-3 text-sm leading-6 text-[#43474c]">
          For indie makers and small startup teams publishing a product page and
          measuring discovery over time. Submit product details and select a
          plan; a paid boost adds a time-limited placement window. A free
          listing remains a useful starting point.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {visiblePlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-[#E2E8F0] p-4"
            >
              <h4 className="font-bold">
                {plan.name} ·{" "}
                {plan.price <= 0
                  ? "Free"
                  : `${formatPricingOfferPrice(getDiscountedPriceCents(plan))} one-time / product`}
              </h4>
              {plan.price > 0 ? (
                <p className="mt-2 text-sm">
                  Placement window: {plan.boostForDays} days.
                </p>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#43474c]">
                {getPricingOfferPresentation(plan, plans).items.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {!visiblePlans.length ? (
          <p className="mt-4 text-sm">
            The current plan catalog is unavailable. Check pricing before
            choosing a launch option.
          </p>
        ) : null}
        <p className="mt-5 text-sm leading-6 text-[#43474c]">
          Free listings use a tracked redirect to your website. Eligible paid
          listings use a direct sponsored link with click tracking.
          Website-click totals are lifetime aggregates; clicks can include
          repeats or automated activity and do not establish signups or
          customers. Shipyard does not provide a verified human-buyer count.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Submit your product free
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={PRICING_PATH}>Current plans and billing terms</Link>
          </Button>
        </div>
      </article>
      <div className="grid gap-6 lg:grid-cols-3">
        {channels.map((channel) => (
          <article
            key={channel.slug}
            className="rounded-xl border border-[#D7DEE8] bg-white p-6"
          >
            <h3 className="text-xl font-bold text-black">{channel.name}</h3>
            <dl className="mt-4 space-y-4 text-sm leading-6 text-[#43474c]">
              {[
                ["Audience", channel.audience],
                ["Products", channel.acceptedProducts],
                ["Submission", channel.submission],
                ["Free option", channel.freeOption],
                ["Paid option", channel.paidOption],
                ["Limitations", channel.limitation],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold text-[#0b1c30]">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-[#475569]">
              Sources checked {channel.verifiedAt}
            </p>
            <ul className="mt-2 space-y-2">
              {channel.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    className="text-sm text-[#0051d5] underline underline-offset-4"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

export async function LaunchChannelComparison() {
  const plans = await getPublicPlans().catch(() => [])
  return <LaunchChannelComparisonContent plans={plans} />
}

export function LaunchPlatformRoundup() {
  return (
    <main className="bg-[#F8FAFC] px-4 py-12 sm:px-6">
      <CoreStructuredData
        scriptKeyPrefix="launch-comparison"
        webPage={{
          path: "/alternatives/product-hunt",
          name: "Product Hunt alternatives for indie launches",
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: "/" },
            { name: "Alternatives", path: "/alternatives" },
            {
              name: "Product Hunt alternatives",
              path: "/alternatives/product-hunt",
            },
          ],
        }}
      />
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-5xl">
          Product Hunt alternatives for indie launches
        </h1>
        <p className="mb-10 mt-5 max-w-3xl text-base leading-7 text-[#43474c]">
          Compare Shipyard HQ, BetaList, and Uneed with Product Hunt before
          choosing where to launch. Review the submission flow, known costs, and
          limitations against each platform’s own sources.
        </p>
        <LaunchChannelComparison />
      </div>
    </main>
  )
}
