"use client"

import Link from "next/link"
import {
  useCallback,
  useRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
} from "react"

import { clickProductCardAction } from "@/actions/public/products/analytics"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

type NextLinkProps = ComponentPropsWithoutRef<typeof Link>
type DataAttributes = Partial<
  Record<`data-${string}`, string | number | boolean | undefined>
>

type FormElementProps = Omit<ComponentPropsWithoutRef<"form">, "action"> &
  DataAttributes

interface ProductClickLinkProps
  extends Omit<NextLinkProps, "href" | "children" | "onClick"> {
  productId: string
  productSlug: string
  children: ReactNode
  href?: NextLinkProps["href"]
  formClassName?: string
  formProps?: FormElementProps
}

export function ProductClickLink({
  productId,
  productSlug,
  children,
  href,
  formClassName,
  formProps,
  ...linkProps
}: ProductClickLinkProps) {
  const formRef = useRef<HTMLFormElement | null>(null)

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button === 1
      )
        return
      if (event.defaultPrevented) return
      event.preventDefault()
      formRef.current?.requestSubmit()
    },
    [],
  )

  return (
    <form
      ref={formRef}
      action={clickProductCardAction}
      {...formProps}
      className={cn(formProps?.className, formClassName)}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <Link
        {...linkProps}
        href={href ?? productPath(productSlug)}
        onClick={handleClick}
      >
        {children}
      </Link>
    </form>
  )
}
