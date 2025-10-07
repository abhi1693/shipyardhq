import { productPageCopy } from "@/lib/copy/productPage"

interface CrewMember {
  id: string
  name: string
  jobTitle?: string | null
}

interface ProductCrewRosterProps {
  members: CrewMember[]
  organizationName?: string | null
}

export function ProductCrewRoster({
  members,
  organizationName,
}: ProductCrewRosterProps) {
  if (members.length === 0 && !organizationName) {
    return null
  }

  const { crew } = productPageCopy
  const hasMembers = members.length > 0

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
          {crew.heading}
        </p>
        {organizationName ? (
          <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {crew.organizationPrefix} {organizationName}
          </span>
        ) : null}
      </div>

      {hasMembers ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <ul className="divide-y divide-border/60">
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
      ) : (
        <p className="text-sm text-muted-foreground">
          {crew.emptyState}
        </p>
      )}
    </section>
  )
}
