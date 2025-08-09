"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/atoms/breadcrumb"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"
import { IconSlash } from "@tabler/icons-react"
import { Fragment } from "react"

type Crumb = { title: string; link?: string }

export function Breadcrumbs({
  items: override,
  prefixItems,
  suffixItems,
  transform,
}: {
  items?: Crumb[]
  prefixItems?: Crumb[]
  suffixItems?: Crumb[]
  transform?: (items: Crumb[]) => Crumb[]
}) {
  const fallbackItems = useBreadcrumbs()

  let items: Crumb[] = override ?? fallbackItems

  if (prefixItems?.length) items = [...prefixItems, ...items]
  if (suffixItems?.length) items = [...items, ...suffixItems]
  if (transform) items = transform(items)

  // Always start with Home
  const first = items[0]
  if (!first || (first.link !== "/" && first.title.toLowerCase() !== "home")) {
    items = [{ title: "Home", link: "/" }, ...items]
  }

  if (items.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.title}-${index}`}>
            {index !== items.length - 1 && (
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < items.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block">
                <IconSlash />
              </BreadcrumbSeparator>
            )}
            {index === items.length - 1 && (
              <BreadcrumbPage>{item.title}</BreadcrumbPage>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
