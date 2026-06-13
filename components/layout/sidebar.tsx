"use client"

import { usePathname } from "next/navigation"
import { useMemo, useTransition } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarFooter,
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
import ProductDraftStartButton from "@/components/pages/products/ProductDraftStartButton"
import { UserAvatarProfile } from "@/components/molecules/UserAvatarProfile"
import { BrandLogo } from "@/components/atoms/brand-logo"
import { useUser } from "@clerk/nextjs"
import { CreditCard, Rocket } from "lucide-react"
import {
  ADMIN_ACCOUNT_PROFILE_PATH,
  ADMIN_BASE_PATH,
  ADMIN_OVERVIEW_PATH,
  HOME_PATH,
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_BASE_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"

interface SidebarProps {
  navItems?: NavItem[]
  showBillingPortal?: boolean
  userRole?: string | null
}

export default function AppSidebar(props: SidebarProps) {
  const pathname = usePathname() ?? "/"
  const { user } = useUser()
  const { navItems = [], showBillingPortal = false, userRole = null } = props

  const [isPortalPending, startPortal] = useTransition()

  function openBillingPortal() {
    startPortal(async () => {
      const res = (await createBillingPortalAction()) as any
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

  const isAdminSection = pathname.startsWith(ADMIN_BASE_PATH)
  const isMemberSection = pathname.startsWith(MEMBER_BASE_PATH)
  const dashboardLabel = isAdminSection ? "Admin Console" : "Founder Dashboard"
  const profileName =
    user?.firstName || user?.fullName || user?.username || "Shipyard member"
  const profileTier = isAdminSection ? "Admin" : "Pro Founder"
  const profileHref = isAdminSection
    ? ADMIN_ACCOUNT_PROFILE_PATH
    : MEMBER_ACCOUNT_PROFILE_PATH

  const filteredNav = useMemo<NavItem[]>(() => {
    const items = [...navItems]
    const shouldExposeAdminEntry =
      userRole === "admin" &&
      isMemberSection &&
      !items.some(
        (item) => item.title === "Admin" || item.url === ADMIN_OVERVIEW_PATH,
      )

    if (shouldExposeAdminEntry) {
      items.push({
        title: "Admin",
        url: ADMIN_OVERVIEW_PATH,
        icon: "settings",
        isActive: false,
      })
    }

    return items
  }, [isMemberSection, navItems, userRole])

  const brandHref = useMemo(() => {
    const queue = [...filteredNav]
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
  }, [filteredNav, pathname])

  const topLevelButtonClasses =
    "relative h-10 rounded-lg px-3 text-slate-600 transition-colors duration-150 hover:bg-[#eff4ff] hover:text-blue-700 data-[active=true]:border-r-2 data-[active=true]:border-blue-700 data-[active=true]:bg-[#eff4ff] data-[active=true]:font-bold data-[active=true]:text-blue-700 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:border-r-0 group-data-[collapsible=icon]:px-0"

  const subLevelButtonClasses =
    "rounded-md text-slate-500 transition-colors duration-150 hover:bg-[#eff4ff] hover:text-blue-700 data-[active=true]:bg-[#eff4ff] data-[active=true]:font-semibold data-[active=true]:text-blue-700"

  return (
    <Sidebar
      collapsible="icon"
      className="border-slate-200 [&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-slate-200 [&_[data-slot=sidebar-inner]]:bg-[#f8f9ff]"
    >
      <SidebarHeader className="px-6 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
        <Link
          href={brandHref}
          className="flex items-center gap-2 transition-opacity hover:opacity-80 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:bg-white"
          aria-label="Shipyard HQ dashboard"
        >
          <BrandLogo
            width={28}
            height={28}
            sizes="28px"
            eager
            className="h-7 w-7 shrink-0"
          />
          <span className="text-lg font-semibold tracking-normal text-slate-950 group-data-[collapsible=icon]:hidden">
            Shipyard HQ
          </span>
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 group-data-[collapsible=icon]:hidden">
          {dashboardLabel}
        </p>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden px-4 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="p-0">
          <SidebarMenu>
            {filteredNav.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo
              const active = itemActive(item)
              const hasChildren = !!(item.items && item.items.length > 0)
              const hasBadge = Boolean(item.label)
              const navLabelAnnouncement = hasBadge
                ? `${item.label} new items`
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
                        {item.icon && <Icon className="size-5 shrink-0" />}
                        <span className="flex-1 truncate text-xs font-semibold uppercase tracking-[0.12em] group-data-[collapsible=icon]:hidden">
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
                      <Icon className="size-5 shrink-0" />
                      <span className="flex-1 truncate text-xs font-semibold uppercase tracking-[0.12em] group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                      {item.label && (
                        <>
                          <SidebarMenuBadge
                            aria-hidden="true"
                            className="rounded-full border border-blue-200 bg-blue-700 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm group-data-[collapsible=icon]:hidden"
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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto gap-5 px-4 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:px-2">
        {isMemberSection ? (
          <ProductDraftStartButton
            mode="member"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-transform active:scale-[0.98] group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0"
            aria-label="Launch new project"
          >
            <Rocket className="h-4 w-4" aria-hidden />
            <span className="group-data-[collapsible=icon]:hidden">
              Launch New Project
            </span>
          </ProductDraftStartButton>
        ) : null}

        {showBillingPortal ? (
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={isPortalPending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0"
            aria-label="Billing portal"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            <span className="group-data-[collapsible=icon]:hidden">
              Billing Portal
            </span>
          </button>
        ) : null}

        <Link
          href={profileHref}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#eff4ff] group-data-[collapsible=icon]:px-0"
        >
          <UserAvatarProfile
            user={user ?? null}
            size={40}
            className="rounded-full border border-slate-200 bg-white group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-8!"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-950">
              {profileName}
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {profileTier}
            </p>
          </div>
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
