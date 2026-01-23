import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { cn } from "@/lib/utils"
import { alternativePath } from "@/lib/routes"

type Alternative = {
  id: string
  slug?: string | null
  name: string
  logoUrl?: string | null
  websiteUrl?: string | null
}

interface ProductAlternativesSectionProps {
  alternatives: Alternative[]
  className?: string
}

export function ProductAlternativesSection({
  alternatives,
  className,
}: ProductAlternativesSectionProps) {
  if (!alternatives.length) {
    return null
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Alternatives
          </h2>
          <p className="text-sm text-muted-foreground">
            Find alternatives to this tool:
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {alternatives.map((alternative) => {
            const href = alternative.slug
              ? alternativePath(alternative.slug)
              : null

            if (!href) {
              return (
                <div
                  key={alternative.id}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <AlternativeAvatar alternative={alternative} />
                  <span className="max-w-[8rem] text-xs font-medium text-muted-foreground">
                    {alternative.name}
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={alternative.id}
                href={href}
                className="group flex flex-col items-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <AlternativeAvatar alternative={alternative} />
                <span className="max-w-[8rem] text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {alternative.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function AlternativeAvatar({ alternative }: { alternative: Alternative }) {
  return (
    <Avatar className="size-10 border border-border bg-white shadow-sm">
      {alternative.logoUrl ? (
        <AvatarImage
          src={alternative.logoUrl}
          alt={`${alternative.name} logo`}
        />
      ) : (
        <AvatarFallback className="text-sm font-semibold uppercase text-muted-foreground">
          {initialsFor(alternative.name)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}

function initialsFor(label: string) {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment.slice(0, 1))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ALT"
  )
}
