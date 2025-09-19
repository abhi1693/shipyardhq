import PublicContainer from "@/components/layout/PublicContainer"

const featuredBadges = [
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
]

export function FeaturedOnSection() {
  return (
    <PublicContainer
      as="section"
      paddingY="py-16"
      className="bg-background/80"
      innerClassName="flex flex-col items-center gap-8 text-center"
      fillScreen={false}
    >
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full border border-[color:var(--brand-2)/0.3] bg-background/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-2)]">
          Featured On
        </span>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          ShipYardHQ is making waves across the indie maker community. Explore a
          few of the platforms that have highlighted our journey.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {featuredBadges.map((badge) => (
          <a
            key={badge.href}
            href={badge.href}
            target="_blank"
            rel="noopener noreferrer"
            title={badge.title}
            className="transition-transform duration-200 hover:scale-[1.02] hover:opacity-90"
          >
            <div className="flex h-16 w-52 items-center justify-center overflow-hidden rounded-md">
              <img
                src={badge.src}
                alt={badge.alt}
                width={badge.width}
                {...(badge.height ? { height: badge.height } : {})}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
          </a>
        ))}
      </div>
    </PublicContainer>
  )
}

export default FeaturedOnSection
