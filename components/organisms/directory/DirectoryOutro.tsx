const highlights = [
  {
    title: "Weekly launch digest",
    description:
      "A curated recap of homepage spotlights, featured campaigns, and maker wins worth bookmarking.",
  },
  {
    title: "Category radar snapshots",
    description:
      "Momentum summaries that surface which categories are heating up across Shipyard in real time.",
  },
  {
    title: "Maker and investor stories",
    description:
      "Perspectives from the builders shipping here and the backers scouting their next bets.",
  },
] as const

export function DirectoryOutro() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-muted/30 px-6 py-12 shadow-[0_35px_100px_-48px_rgba(15,61,105,0.6)] md:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_0%_0%,var(--brand-1)/0.1,transparent_60%),radial-gradient(140%_120%_at_100%_20%,var(--brand-3)/0.12,transparent_65%)]"
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Keep exploring
          </span>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Stay in the Shipyard launch current
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Shipyard connects builders, investors, and operator-fans with the launches shaping what ships next. Follow our digests, radar snapshots, and maker stories to keep the directory on your radar between visits.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border/50 bg-background/85 p-6 shadow-sm shadow-black/5"
            >
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DirectoryOutro
