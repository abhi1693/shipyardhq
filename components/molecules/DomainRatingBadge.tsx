import { Image } from "@/components/atoms/image"
import { cn } from "@/lib/utils"

const BADGE_IMAGE_URL =
  "https://supadr.com/api/badge/shipyardhq.dev.svg?theme=orange&template=awards"
const AFFILIATE_URL =
  "https://supadr.com?via=shipyardhq&utm_source=shipyardhq.dev&utm_medium=badge&utm_campaign=supadr"

export function DomainRatingBadge({ className }: { className?: string }) {
  return (
    <a
      href={AFFILIATE_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center transition-transform duration-200 hover:scale-[1.01] hover:opacity-90",
        className,
      )}
      title="Domain Rating for shipyardhq.dev"
    >
      <Image
        src={BADGE_IMAGE_URL}
        alt="Domain Rating badge for shipyardhq.dev"
        width={280}
        height={64}
        className="h-auto w-[280px]"
        loading="lazy"
        unoptimized
      />
    </a>
  )
}

export default DomainRatingBadge
