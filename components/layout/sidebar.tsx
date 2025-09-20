"use client"

import { usePathname } from "next/navigation"
import { useMemo, useTransition } from "react"
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

  const filteredNav = navItems

  const brandHref = useMemo(() => {
    const queue = [...navItems]
    while (queue.length) {
      const candidate = queue.shift()
      if (!candidate) continue
      if (candidate.url && candidate.url !== "#") {
        return candidate.url
      }
      if (candidate.items?.length) {
        queue.push(...candidate.items)
      }
    }
    if (pathname.startsWith("/member")) return "/member/overview"
    if (pathname.startsWith("/admin")) return "/admin/overview"
    return "/"
  }, [navItems, pathname])

  const topLevelButtonClasses =
    "px-3 transition-colors duration-150 hover:bg-[color:var(--brand-1)/0.1] hover:text-[color:var(--brand-1)] data-[active=true]:border data-[active=true]:border-[color:var(--brand-1)/0.4] data-[active=true]:bg-[color:var(--brand-1)/0.22] data-[active=true]:text-[color:var(--brand-1)] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0"

  const subLevelButtonClasses =
    "transition-colors duration-150 hover:bg-[color:var(--brand-1)/0.1] hover:text-[color:var(--brand-1)] data-[active=true]:bg-[color:var(--brand-1)/0.18] data-[active=true]:text-[color:var(--brand-1)]"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href={brandHref}
          className="inline-flex items-center gap-2 px-1"
          aria-label="ShipYardHQ home"
        >
          <BrandLogo
            width={28}
            height={28}
            className="h-7 w-7 rounded-sm"
            priority
          />
          <span className="text-base md:text-lg font-bold tracking-tight text-[color:var(--brand-1)] group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
            ShipYardHQ
          </span>
        </Link>
        <div className="mx-1 mt-1 h-px rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] opacity-70" />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/85 group-data-[collapsible=icon]:hidden">
            Admin
          </SidebarGroupLabel>
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
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        size="lg"
                        className={topLevelButtonClasses}
                      >
                        {item.icon && <Icon className="shrink-0 group-data-[collapsible=icon]:size-5" />}
                        <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
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
                                className={subLevelButtonClasses}
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
                    size="lg"
                    className={topLevelButtonClasses}
                  >
                    <Link
                      href={item.url}
                      aria-current={isActivePath(item.url) ? "page" : undefined}
                    >
                      <Icon className="shrink-0 group-data-[collapsible=icon]:size-5" />
                      <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                      {item.label && (
                        <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
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
                  size="lg"
                  className={topLevelButtonClasses}
                >
                  <Icons.billing className="shrink-0 group-data-[collapsible=icon]:size-5" />
                  <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                    Customer Portal
                  </span>
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
