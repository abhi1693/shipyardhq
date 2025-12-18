import { Image } from "@/components/atoms/image"
import {
  SUPADR_AFFILIATE_URL,
  SUPADR_BADGE_IMAGE_URL,
} from "@/lib/marketing/affiliates"
import { cn } from "@/lib/utils"

const BADGE_IMAGE_URL = SUPADR_BADGE_IMAGE_URL
const AFFILIATE_URL = SUPADR_AFFILIATE_URL

export function DomainRatingBadge({ className }: { className?: string }) {
  return (
    <a
      href={AFFILIATE_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
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
