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
    <section className="relative overflow-hidden rounded-3xl border border-border bg-white px-6 py-12 shadow-sm md:px-12">
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
              className="rounded-3xl border border-border bg-white p-6 shadow-sm"
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
