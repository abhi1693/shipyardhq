import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/atoms/avatar"
import { cn } from "@/lib/utils"

type Alternative = {
  id: string
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
          {alternatives.map((alternative) =>
            alternative.websiteUrl ? (
              <Link
                key={alternative.id}
                href={alternative.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 text-center"
              >
                <AlternativeAvatar alternative={alternative} />
                <span className="max-w-[8rem] text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {alternative.name}
                </span>
              </Link>
            ) : (
              <div
                key={alternative.id}
                className="flex flex-col items-center gap-2 text-center"
              >
                <AlternativeAvatar alternative={alternative} />
                <span className="max-w-[8rem] text-xs font-medium text-muted-foreground">
                  {alternative.name}
                </span>
              </div>
            ),
          )}
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
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "ALT"
}
