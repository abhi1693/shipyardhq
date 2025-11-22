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
  SidebarMenuBadge,
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
import { createBillingPortalAction } from "@/actions/member/billing/portal"
import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import {
  ADMIN_BASE_PATH,
  ADMIN_OVERVIEW_PATH,
  HOME_PATH,
  MEMBER_BASE_PATH,
  MEMBER_OVERVIEW_PATH,
  MEMBER_PRODUCTS_CLAIM_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"

interface SidebarProps {
  navItems?: NavItem[]
  showBillingPortal?: boolean
}

export default function AppSidebar(props: SidebarProps) {
  const pathname = usePathname() ?? "/"
  const { navItems = [], showBillingPortal = false } = props

  const [isPortalPending, startPortal] = useTransition()

  function openBillingPortal() {
    startPortal(async () => {
      const res = (await createBillingPortalAction(false)) as any
      if (res?.link) {
        try {
          window.open(res.link, "_blank", "noopener,noreferrer")
        } catch {}
      } else {
        toast.error(res?.error || "Unable to open billing portal")
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
      if (
        normalized === MEMBER_PRODUCTS_PATH &&
        current.startsWith(MEMBER_PRODUCTS_CLAIM_PATH)
      ) {
        return false
      }
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
    if (pathname.startsWith(MEMBER_BASE_PATH)) return MEMBER_OVERVIEW_PATH
    if (pathname.startsWith(ADMIN_BASE_PATH)) return ADMIN_OVERVIEW_PATH
    return HOME_PATH
  }, [navItems, pathname])

  const topLevelButtonClasses =
    "relative px-3 transition-colors duration-150 hover:bg-[color:var(--brand-1)/0.1] hover:text-[color:var(--brand-1)] data-[active=true]:border data-[active=true]:border-[color:var(--brand-1)/0.4] data-[active=true]:bg-[color:var(--brand-1)/0.22] data-[active=true]:text-[color:var(--brand-1)] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0"

  const subLevelButtonClasses =
    "transition-colors duration-150 hover:bg-[color:var(--brand-1)/0.1] hover:text-[color:var(--brand-1)] data-[active=true]:bg-[color:var(--brand-1)/0.18] data-[active=true]:text-[color:var(--brand-1)]"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <BrandWordmark href={brandHref} compact eager />
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
              const hasBadge = Boolean(item.label)
              const navLabelAnnouncement =
                hasBadge && item.title === "Feedback"
                  ? `${item.label} new feedback received`
                  : undefined
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
                        {item.icon && (
                          <Icon className="shrink-0 group-data-[collapsible=icon]:size-5" />
                        )}
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
                    className={`${topLevelButtonClasses} ${
                      hasBadge
                        ? "border border-[color:var(--brand-1)/0.45] bg-[color:var(--brand-1)/0.08]"
                        : ""
                    }`}
                  >
                    <Link
                      href={item.url}
                      aria-current={isActivePath(item.url) ? "page" : undefined}
                      aria-label={
                        item.title === "Feedback" && navLabelAnnouncement
                          ? `${item.title} (${navLabelAnnouncement})`
                          : undefined
                      }
                    >
                      <Icon className="shrink-0 group-data-[collapsible=icon]:size-5" />
                      <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                      {item.label && (
                        <>
                          <SidebarMenuBadge
                            aria-hidden="true"
                            className="group-data-[collapsible=icon]:hidden rounded-full border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)]/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_4px_10px_rgba(15,23,42,0.18)]"
                          >
                            {item.label}
                          </SidebarMenuBadge>
                          {navLabelAnnouncement && (
                            <span className="sr-only">
                              {navLabelAnnouncement}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {showBillingPortal && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Billing Portal"
                  onClick={openBillingPortal}
                  disabled={isPortalPending}
                  size="lg"
                  className={topLevelButtonClasses}
                >
                  <Icons.billing className="shrink-0 group-data-[collapsible=icon]:size-5" />
                  <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                    Billing Portal
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
