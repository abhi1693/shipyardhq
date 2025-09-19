import { IconAnchor, IconCompass, IconSailboat } from "@tabler/icons-react"

const highlights = [
  {
    label: "Discover momentum",
    description:
      "Map launch tasks, growth plays, and support threads without hopping between tools.",
    icon: IconCompass,
  },
  {
    label: "Equip your crew",
    description:
      "Invite teammates, assign checklists, and share intel in a single member workspace.",
    icon: IconAnchor,
  },
  {
    label: "Celebrate progress",
    description:
      "Surface wins with automated summaries, velocity trends, and public launch cards.",
    icon: IconSailboat,
  },
]

export default function OnboardingMarketingPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-none bg-white/90 px-10 py-12 text-slate-900 shadow-[0_25px_60px_-40px_rgba(56,189,248,0.45)] ring-1 ring-sky-100/70 backdrop-blur xl:px-12 xl:py-14 lg:flex lg:w-full lg:items-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(125,211,252,0.45),_transparent_72%)]" />
        <div className="absolute inset-x-[-25%] bottom-[-45%] h-[22rem] rounded-[55%] bg-[radial-gradient(circle,_rgba(56,189,248,0.18),_transparent_78%)] blur-[90px]" />
        <div className="absolute -right-24 top-20 h-48 w-48 rounded-full bg-sky-300/35 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-between gap-10">
        <div className="space-y-8 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/50 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Member onboarding
          </span>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              Steady winds for your next launch
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Align your workspace with the mission you&apos;re on today so
              ShipYardHQ can surface the right dashboards, partners, and
              playbooks.
            </p>
          </div>
        </div>

        <ul className="space-y-5 rounded-3xl border border-sky-100/70 bg-white/85 p-5 text-sm text-slate-700 shadow-[0_20px_45px_-40px_rgba(14,165,233,0.35)] backdrop-blur">
          {highlights.map(({ label, description, icon: Icon }) => (
            <li key={label} className="flex items-start gap-4">
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {label}
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
