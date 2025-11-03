import Link from "next/link"

import { PRICING_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

type SponsorPromoProps = {
  className?: string
  href?: string
}

const PROMO_COPY = "Want to become a sponsor and show your product here?"
const LINK_TEXT = "Advertise"
const BASE_TEXT_CLASS = "text-[11px] text-muted-foreground"
const LINK_CLASS =
  "font-semibold text-[#4F3FF4] underline-offset-4 hover:underline"

export function SponsorPromo({
  className,
  href = PRICING_PATH,
}: SponsorPromoProps) {
  return (
    <div className={cn(BASE_TEXT_CLASS, className)}>
      {PROMO_COPY}{" "}
      <Link href={href} className={LINK_CLASS}>
        {LINK_TEXT}
      </Link>
    </div>
  )
}
