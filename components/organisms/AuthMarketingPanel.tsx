import {
  IconCompass,
  IconRocket,
  IconTrendingUp,
  IconUsersGroup,
} from "@tabler/icons-react"

const features = [
  {
    icon: IconRocket,
    label: "Built for indie makers, by indie makers",
  },
  {
    icon: IconUsersGroup,
    label: "Showcase your product and find early fans",
  },
  {
    icon: IconTrendingUp,
    label: "Supportive community, honest feedback, real momentum",
  },
]

export default function AuthMarketingPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-none bg-white/85 px-12 py-10 text-slate-900 shadow-[0_25px_60px_-35px_rgba(59,130,246,0.55)] ring-1 ring-sky-100/80 backdrop-blur lg:flex lg:flex-col">
      {/* Layered gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.25),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(125,211,252,0.45),_transparent_72%)]" />
        <div className="absolute inset-x-[-20%] bottom-[-55%] h-[26rem] rounded-[50%] bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.35),_transparent_70%)] blur-[70px]" />
        <div className="absolute -right-24 top-16 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl" />
        <svg
          aria-hidden
          viewBox="0 0 1440 320"
          className="absolute bottom-0 left-0 w-full text-sky-200/55"
        >
          <path
            fill="currentColor"
            d="M0,224L30,197.3C60,171,120,117,180,96C240,75,300,85,360,122.7C420,160,480,224,540,245.3C600,267,660,245,720,245.3C780,245,840,267,900,256C960,245,1020,203,1080,197.3C1140,192,1200,224,1260,224C1320,224,1380,192,1410,176L1440,160L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"
          />
        </svg>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-12">
        <div className="space-y-8 pt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
            <IconCompass aria-hidden className="size-3.5 text-sky-500" />
            Build Momentum
          </span>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              ShipYardHQ
            </h1>
            <p className="text-sm text-slate-600">A launchpad for indie SaaS</p>
          </div>

          <div className="space-y-4 text-slate-700">
            <h2 className="text-3xl font-semibold leading-tight text-slate-900">
              Launch smarter. Build boldly.
            </h2>
            <p className="text-sm leading-relaxed">
              ShipYardHQ is where indie products accelerate momentum. Publish
              your project, meet a supportive community, and find clear paths
              toward your next milestone. No fluff—just practical growth.
            </p>
          </div>
        </div>

        <ul className="space-y-4 rounded-3xl border border-sky-100/60 bg-white/85 p-6 text-sm text-slate-800 shadow-[0_20px_45px_-35px_rgba(14,116,144,0.45)] backdrop-blur">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="font-medium text-slate-800">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
