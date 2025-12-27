import { productPageCopy } from "@/lib/copy/productPage"

interface CrewMember {
  id: string
  name: string
  jobTitle?: string | null
}

interface ProductCrewRosterProps {
  members: CrewMember[]
}

export function ProductCrewRoster({ members }: ProductCrewRosterProps) {
  if (members.length === 0) {
    return null
  }

  const { crew } = productPageCopy

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
          {crew.heading}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-1 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-base font-semibold text-foreground">
                {member.name}
              </span>
              {member.jobTitle ? (
                <span className="text-sm text-muted-foreground">
                  {member.jobTitle}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
