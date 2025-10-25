import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/atoms/avatar"
import { cn } from "@/lib/utils"
import type { AlternativeCatalogItem } from "@/actions/public/alternatives/actions"
import { alternativePath } from "@/lib/routes"

interface AlternativeCatalogCardProps {
  alternative: AlternativeCatalogItem
  className?: string
}

export function AlternativeCatalogCard({
  alternative,
  className,
}: AlternativeCatalogCardProps) {
  const count = alternative._count.products
  const countLabel = `${count} alternative${count === 1 ? "" : "s"}`
  const initials = getInitials(alternative.name)
  const websiteUrl = alternative.websiteUrl?.trim()
  const detailHref = alternativePath(alternative.slug)

  const content = (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md",
        className,
      )}
    >
      <header className="flex items-start gap-4">
        <Avatar className="h-12 w-12 border border-border bg-white shadow-sm">
          {alternative.logoUrl ? (
            <AvatarImage
              src={alternative.logoUrl}
              alt={`${alternative.name} logo`}
            />
          ) : (
            <AvatarFallback className="text-sm font-semibold uppercase text-muted-foreground">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {alternative.name}
          </h3>
          {websiteUrl ? (
            <p className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              <span className="truncate">{cleanHost(websiteUrl)}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </p>
          ) : null}
        </div>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground break-words">
        {alternative.description}
      </p>

      <footer className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {countLabel}
        </span>
      </footer>
    </article>
  )

  return (
    <Link
      href={detailHref}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}

function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return letters || "ALT"
}

function cleanHost(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
