"use client"

import { usePathname } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarInput,
  SidebarTrigger,
} from "@/components/atoms/sidebar"
import { Icons } from "../icons"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/atoms/collapsible"
import { IconChevronRight } from "@tabler/icons-react"
import Link from "next/link"
import { NavItem } from "@/types"
import { toast } from "sonner"
import { createCustomerPortalAction } from "@/actions/member/billing/portal"
import { BrandLogo } from "@/components/atoms/brand-logo"

interface SidebarProps {
  navItems?: NavItem[]
  showCustomerPortal?: boolean
}

export default function AppSidebar(props: SidebarProps) {
  const pathname = usePathname()
  const { navItems = [], showCustomerPortal = false } = props

  const [query, setQuery] = useState("")
  const [isPortalPending, startPortal] = useTransition()

  function openCustomerPortal() {
    startPortal(async () => {
      const res = (await createCustomerPortalAction(false)) as any
      if (res?.link) {
        try {
          window.open(res.link, "_blank", "noopener,noreferrer")
        } catch {}
      } else {
        toast.error(res?.error || "Unable to open customer portal")
      }
    })
  }

  const isActivePath = (url?: string) => {
    if (!url || url === "#") return false
    try {
      const normalize = (p: string) => {
        if (p === "/") return "/"
        return p.endsWith("/") ? p.slice(0, -1) : p
      }
      const normalized = normalize(url)
      const current = normalize(pathname)
      if (normalized === "/") return current === "/"
      return current === normalized || current.startsWith(`${normalized}/`)
    } catch {
      return pathname === url
    }
  }

  const itemActive = (item: NavItem): boolean => {
    if (isActivePath(item.url)) return true
    if (item.items?.length) return item.items.some((i) => isActivePath(i.url))
    return false
  }

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navItems
    return navItems
      .map((item) => {
        const titleMatch = item.title.toLowerCase().includes(q)
        const sub = (item.items || []).filter((s) =>
          `${s.title} ${s.label ?? ""}`.toLowerCase().includes(q),
        )
        if (titleMatch) return { ...item }
        if (sub.length) return { ...item, items: sub }
        return null
      })
      .filter(Boolean) as NavItem[]
  }, [navItems, query])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1">
          <SidebarTrigger className="md:hidden" />
          <Link
            href="/admin/overview"
            className="inline-flex items-center gap-2"
            aria-label="ShipYardHQ admin overview"
          >
            <BrandLogo
              width={28}
              height={28}
              className="h-7 w-7 rounded-sm"
              priority
            />
            <span className="text-base md:text-lg font-bold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
              ShipYardHQ
            </span>
          </Link>
        </div>
        <div className="px-1">
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search navigation…"
            aria-label="Search admin navigation"
          />
        </div>
        <div className="mx-1 mt-1 h-px rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] opacity-70" />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {filteredNav.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo
              const active = itemActive(item)
              const hasChildren = !!(item.items && item.items.length > 0)
              return hasChildren ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={active}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={active}>
                        {item.icon && <Icon />}
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const SubIcon = subItem.icon
                            ? Icons[subItem.icon]
                            : null
                          const subActive = isActivePath(subItem.url)
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                              >
                                <Link
                                  href={subItem.url}
                                  className="flex items-center gap-2"
                                  aria-current={subActive ? "page" : undefined}
                                >
                                  {SubIcon && <SubIcon className="h-4 w-4" />}
                                  <span className="flex-1 truncate">
                                    {subItem.title}
                                  </span>
                                  {subItem.label && (
                                    <span className="text-xs text-muted-foreground">
                                      {subItem.label}
                                    </span>
                                  )}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActivePath(item.url)}
                  >
                    <Link
                      href={item.url}
                      aria-current={isActivePath(item.url) ? "page" : undefined}
                    >
                      <Icon />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.label && (
                        <span className="text-xs text-muted-foreground">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {showCustomerPortal && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Customer Portal"
                  onClick={openCustomerPortal}
                  disabled={isPortalPending}
                >
                  <Icons.billing />
                  <span className="flex-1 truncate">Customer Portal</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
