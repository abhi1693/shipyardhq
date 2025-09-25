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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
          {crew.heading}
        </p>
        {organizationName ? (
          <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-[color:var(--brand-1)] ring-1 ring-slate-200/40 dark:bg-slate-900/70 dark:ring-slate-800/40">
            {crew.organizationPrefix} {organizationName}
          </span>
        ) : null}
      </div>

      {hasMembers ? (
        <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200/40 shadow-[0_24px_70px_-55px_rgba(7,58,104,0.45)] dark:ring-slate-800/40">
          <ul className="divide-y divide-slate-200/60 bg-white dark:divide-slate-800/50 dark:bg-slate-900/70">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-1 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-200/90"
              >
                <span className="text-base font-medium text-foreground">
                  {member.name}
                </span>
                {member.jobTitle ? (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {member.jobTitle}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {crew.emptyState}
        </p>
      )}
    </section>
  )
}
