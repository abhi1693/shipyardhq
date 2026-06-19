import Link, { type LinkProps } from "next/link"
import clsx from "clsx"
import { forwardRef, type AnchorHTMLAttributes } from "react"

import { BrandLogo } from "@/components/atoms/brand-logo"
import { BRAND_NAME } from "@/lib/brand"
import { HOME_PATH } from "@/lib/routes"

type LinkBehaviourProps = Pick<
  LinkProps,
  "prefetch" | "replace" | "scroll" | "shallow" | "locale"
>

type BrandWordmarkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children" | "className"
> &
  LinkBehaviourProps & {
    href?: LinkProps["href"]
    hideLabel?: boolean
    compact?: boolean
    eager?: boolean
  }

export const BrandWordmark = forwardRef<HTMLAnchorElement, BrandWordmarkProps>(
  function BrandWordmark(
    {
      href = HOME_PATH,
      hideLabel = false,
      compact = false,
      eager = false,
      prefetch,
      replace,
      scroll,
      shallow,
      locale,
      ...rest
    },
    ref,
  ) {
    const { "aria-label": ariaLabel, ...linkElementProps } = rest
    const size = compact ? 28 : 32
    const sizeClasses = compact ? "h-7 w-7" : "h-8 w-8"
    const computedAriaLabel =
      ariaLabel ?? (hideLabel ? `${BRAND_NAME} home` : undefined)

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        replace={replace}
        scroll={scroll}
        shallow={shallow}
        locale={locale}
        aria-label={computedAriaLabel}
        className="group inline-flex items-center gap-2 text-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white group-data-[collapsible=icon]/sidebar-wrapper:justify-center group-data-[collapsible=icon]/sidebar-wrapper:gap-0"
        {...linkElementProps}
      >
        <BrandLogo
          width={size}
          height={size}
          sizes={compact ? "28px" : "(max-width: 768px) 24px, 32px"}
          eager={eager}
          className={clsx(
            "shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.05]",
            sizeClasses,
          )}
        />
        {!hideLabel && (
          <span
            className={clsx(
              "text-base font-semibold tracking-tight text-foreground whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]/sidebar-wrapper:pointer-events-none group-data-[collapsible=icon]/sidebar-wrapper:opacity-0",
              compact ? "text-[15px]" : null,
            )}
          >
            {BRAND_NAME}
          </span>
        )}
      </Link>
    )
  },
)
