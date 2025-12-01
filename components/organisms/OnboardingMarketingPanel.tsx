import {
  IconAnchor,
  IconCompass,
  IconGauge,
  IconRadar2,
} from "@tabler/icons-react"

const featureTiles = [
  {
    label: "Launch cockpit",
    description: "Focus views for roadmap, comms, and signals in one pane.",
    icon: IconCompass,
  },
  {
    label: "Crew rituals",
    description: "Templates for weekly syncs, launch briefs, and retro notes.",
    icon: IconAnchor,
  },
  {
    label: "Signal routing",
    description: "Noise-free alerts for intent, traffic, and activation drops.",
    icon: IconRadar2,
  },
  {
    label: "Velocity watch",
    description: "Glanceable dashboards with trendlines and share-ready cards.",
    icon: IconGauge,
  },
]

const quickFacts = [
  { label: "Setup", value: "≈2 min", hint: "guided picks" },
  { label: "Team slots", value: "Unlimited", hint: "invite anytime" },
  { label: "Mode", value: "Collaborative", hint: "live updates" },
]

export default function OnboardingMarketingPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-none bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-10 py-12 text-slate-50 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.8)] ring-1 ring-white/10 backdrop-blur xl:px-12 xl:py-14 lg:flex lg:w-full lg:items-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(56,189,248,0.2),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,_rgba(14,165,233,0.2),_transparent_38%)]" />
        <div className="absolute inset-x-[-25%] bottom-[-40%] h-[26rem] rounded-[60%] bg-[radial-gradient(circle,_rgba(14,165,233,0.16),_transparent_75%)] blur-[95px]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-sky-100">
              Member onboarding
            </span>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                A calmer runway to ship faster
              </h1>
              <p className="text-sm leading-relaxed text-slate-200/90">
                Pick how you operate and we&apos;ll pre-build dashboards, rituals,
                and alerts so your workspace feels ready on day one.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100">
                ≈2 minute setup
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100">
                No long forms
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100">
                Change anytime
              </span>
            </div>
          </div>

          <div className="grid min-w-[220px] gap-3 rounded-3xl border border-white/15 bg-white/5 p-4 text-sm text-slate-100 shadow-[0_20px_55px_-40px_rgba(14,165,233,0.8)]">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-200/80">
              <span>Preview</span>
              <span>Workspace</span>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-xs text-slate-200/90">You&apos;ll start with</p>
              <div className="flex flex-col gap-2 text-sm font-semibold">
                <span className="text-white">Launch checklist</span>
                <span className="text-white">Signal radar</span>
                <span className="text-white">Crew hub</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-left text-xs">
              {quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-200/80">
                    {fact.label}
                  </p>
                  <p className="text-sm font-semibold text-white">{fact.value}</p>
                  <p className="text-[11px] text-slate-200/80">{fact.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {featureTiles.map(({ label, description, icon: Icon }) => (
            <div
              key={label}
              className="group flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
            >
              <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-100 shadow-[0_15px_35px_-25px_rgba(14,165,233,0.7)]">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/80">
                  {label}
                </p>
                <p className="leading-relaxed text-slate-100/90">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
