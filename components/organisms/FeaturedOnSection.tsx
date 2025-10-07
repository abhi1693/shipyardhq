import Image from "next/image"
import { cn } from "@/lib/utils"

type FeaturedOnSectionProps = {
  className?: string
  eyebrow?: string
  title?: string
  description?: string
  align?: "left" | "center"
}

const featuredBadges = [
  {
    href: "https://launchigniter.com/product/shipyardhq?ref=badge-shipyardhq",
    title: "Featured on LaunchIgniter",
    src: "https://launchigniter.com/api/badge/shipyardhq?theme=neutral",
    alt: "Featured on LaunchIgniter",
    width: 212,
    height: 55,
  },
  {
    href: "https://firsto.co/projects/shipyardhq",
    title: "Find us on Firsto",
    src: "https://firsto.co/images/badges/find-us-on-firsto.svg",
    alt: "Find us on Firsto",
    width: 195,
  },
  {
    href: "https://startupfa.me/s/shipyardhq?utm_source=shipyardhq.dev",
    title: "Featured on Startup Fame",
    src: "https://startupfa.me/badges/featured/light.webp",
    alt: "Featured on Startup Fame",
    width: 171,
    height: 54,
  },
  {
    href: "https://twelve.tools",
    title: "Featured on Twelve Tools",
    src: "https://twelve.tools/badge0-white.svg",
    alt: "Featured on Twelve Tools",
    width: 200,
    height: 54,
  },
  {
    href: "https://fazier.com/launches/shipyardhq.dev",
    title: "Featured on Fazier",
    src: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=light",
    alt: "Fazier badge",
    width: 250,
  },
  {
    href: "https://yo.directory/",
    title: "Featured on yo.directory",
    src: "https://cdn.prod.website-files.com/65c1546fa73ea974db789e3d/65e1e171f89ebfa7bd0129ac_yodirectory-featured.png",
    alt: "yo.directory",
    width: 150,
    height: 54,
  },
  {
    href: "https://turbo0.com/item/shipyardhq",
    title: "Listed on Turbo0",
    src: "https://img.turbo0.com/badge-listed-light.svg",
    alt: "Listed on Turbo0",
    height: 54,
  },
  {
    href: "https://findly.tools/shipyardhq?utm_source=shipyardhq",
    title: "Featured on findly.tools",
    src: "https://findly.tools/badges/findly-tools-badge-light.svg",
    alt: "Featured on findly.tools",
    width: 150,
  },
]

export function FeaturedOnSection({
  className,
  eyebrow = "Featured on",
  title = "Spotlighted across indie launch guides",
  description = "Shipyard listings are regularly surfaced across trusted directories and launch roundups. Here are a few recent features.",
  align = "center",
}: FeaturedOnSectionProps) {
  const isCenter = align === "center"

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-white px-6 py-8 shadow-sm md:px-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2",
          isCenter ? "items-center text-center" : "text-left",
        )}
      >
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuredBadges.map((badge) => (
          <a
            key={badge.href}
            href={badge.href}
            target="_blank"
            rel="noopener noreferrer"
            title={badge.title}
            className="group relative flex h-16 items-center justify-center rounded-xl border border-border/70 bg-muted/15 px-4 transition hover:border-border hover:bg-muted/40"
          >
            <Image
              src={badge.src}
              alt={badge.alt}
              width={badge.width ?? 200}
              height={badge.height ?? 60}
              className="max-h-full max-w-full object-contain opacity-90 transition-opacity group-hover:opacity-100"
              loading="lazy"
              unoptimized
            />
          </a>
        ))}
      </div>
    </section>
  )
}

export default FeaturedOnSection
