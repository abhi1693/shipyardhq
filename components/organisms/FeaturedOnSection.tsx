import Image from "next/image"
import PublicContainer from "@/components/layout/PublicContainer"

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

export function FeaturedOnSection() {
  return (
    <PublicContainer
      as="section"
      paddingY="py-16"
      className="relative overflow-hidden bg-background/90"
      innerClassName="relative flex flex-col items-center gap-8 text-center"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.4] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "radial-gradient(120%_120%_at_10%_-10%, rgba(7, 58, 104, 0.2), transparent 72%), radial-gradient(110%_110%_at_90%_-10%, rgba(16, 88, 142, 0.18), transparent 78%)",
          maskImage:
            "radial-gradient(80%_120%_at_50%_0%, rgba(0,0,0,0.92), transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-30%] bottom-[-48px] -z-30 h-52 rounded-[50%] bg-[radial-gradient(75%_100%_at_50%_0%,var(--brand-3)/0.24,transparent_82%)] blur-3xl"
      />
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-white/8 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-2)] backdrop-blur">
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
            className="group relative flex h-16 w-52 items-center justify-center overflow-hidden px-3 transition-transform duration-200 hover:-translate-y-0.5"
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
    </PublicContainer>
  )
}

export default FeaturedOnSection
