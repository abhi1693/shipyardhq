"use client"

import Link from "next/link"
import { type ComponentPropsWithoutRef, type ReactNode } from "react"

import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

type NextLinkProps = ComponentPropsWithoutRef<typeof Link>
type DataAttributes = Partial<
  Record<`data-${string}`, string | number | boolean | undefined>
>

type FormElementProps = DataAttributes & { className?: string }

interface ProductClickLinkProps extends Omit<
  NextLinkProps,
  "href" | "children" | "onClick"
> {
  productSlug: string
  children: ReactNode
  href?: NextLinkProps["href"]
  formClassName?: string
  formProps?: FormElementProps
}

export function ProductClickLink({
  productSlug,
  children,
  href,
  formClassName,
  formProps,
  ...linkProps
}: ProductClickLinkProps) {
  const { className: formPropsClassName, ...formDataAttrs } = formProps ?? {}

  return (
    <Link
      {...linkProps}
      {...formDataAttrs}
      href={href ?? productPath(productSlug)}
      className={cn(linkProps.className, formPropsClassName, formClassName)}
    >
      {children}
    </Link>
  )
}
