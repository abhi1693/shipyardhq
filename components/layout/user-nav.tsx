"use client"
import { Button } from "@/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { SignOutButton, useUser } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  UserRoundCog,
} from "lucide-react"
import {
  ADMIN_ACCOUNT_PROFILE_PATH,
  ADMIN_BASE_PATH,
  ADMIN_OVERVIEW_PATH,
  adminPath,
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_OVERVIEW_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"

const fallbackAvatarUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%23d3e4fe'/%3E%3Ccircle cx='32' cy='35' r='16' fill='%23c6845f'/%3E%3Cpath d='M17 30c2-12 10-18 22-15 8 2 13 9 11 18-7-7-17-8-33-3z' fill='%23231510'/%3E%3Ccircle cx='25' cy='35' r='2.2' fill='%230b1c30'/%3E%3Ccircle cx='39' cy='35' r='2.2' fill='%230b1c30'/%3E%3Cpath d='M25 46c5 4 12 4 17 0' stroke='%230b1c30' stroke-width='3' stroke-linecap='round' fill='none'/%3E%3Ccircle cx='19' cy='39' r='4' fill='%23e2a07b'/%3E%3Ccircle cx='45' cy='39' r='4' fill='%23e2a07b'/%3E%3C/svg%3E"

function getInitials(user: ReturnType<typeof useUser>["user"]) {
  const nameInitials = user?.fullName
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")

  if (nameInitials) return nameInitials

  const emailInitials = user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2)
  if (emailInitials) return emailInitials.toUpperCase()

  return "SY"
}

function getDisplayName(user: ReturnType<typeof useUser>["user"]) {
  return (
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Shipyard Member"
  )
}

export function UserNav() {
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const isAdminSection = pathname.startsWith(ADMIN_BASE_PATH)
  const dashboardPath = isAdminSection ? ADMIN_OVERVIEW_PATH : MEMBER_OVERVIEW_PATH
  const productsPath = isAdminSection ? adminPath("products") : MEMBER_PRODUCTS_PATH
  const productsLabel = isAdminSection ? "Products" : "My Products"
  const accountPath = isAdminSection
    ? ADMIN_ACCOUNT_PROFILE_PATH
    : MEMBER_ACCOUNT_PROFILE_PATH

  if (user) {
    const userInitials = getInitials(user)
    const displayName = getDisplayName(user)
    const avatarUrl = user.imageUrl || fallbackAvatarUrl
    const avatarAlt = user.fullName ?? "User profile"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-[30px] w-[30px] rounded-full p-0"
            style={{ width: 30, height: 30 }}
          >
            <Avatar className="size-full">
              <AvatarImage
                src={avatarUrl}
                alt={avatarAlt}
                width={30}
                height={30}
              />
              <AvatarFallback className="bg-[#d3e4fe] text-xs font-semibold uppercase text-gray-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 overflow-hidden rounded-none border border-gray-200 bg-white p-0 text-gray-900 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]"
          align="end"
          sideOffset={12}
          forceMount
        >
          <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-5">
            <Avatar className="size-12 shrink-0 overflow-hidden rounded-full">
              <AvatarImage
                src={avatarUrl}
                alt={avatarAlt}
                width={48}
                height={48}
              />
              <AvatarFallback className="bg-[#d3e4fe] text-sm font-semibold uppercase text-gray-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold text-gray-900">
                  {displayName}
                </span>
              </div>
            </div>
          </div>

          <div className="py-3">
            <div className="px-6 py-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Management
              </h3>
            </div>
            <DropdownMenuItem
              className="group flex cursor-pointer items-center gap-3 rounded-none px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-700"
              onSelect={(event) => {
                event.preventDefault()
                router.push(dashboardPath)
              }}
            >
              <LayoutDashboard className="size-5 text-gray-500 transition-colors group-hover:text-gray-900" />
              <span className="font-medium">Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group flex cursor-pointer items-center gap-3 rounded-none px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-700"
              onSelect={(event) => {
                event.preventDefault()
                router.push(productsPath)
              }}
            >
              <Boxes className="size-5 text-gray-500 transition-colors group-hover:text-gray-900" />
              <span className="font-medium">{productsLabel}</span>
            </DropdownMenuItem>
          </div>

          <div className="border-t border-gray-100 py-3">
            <div className="px-6 py-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Settings
              </h3>
            </div>
            <DropdownMenuItem
              className="group flex cursor-pointer items-center gap-3 rounded-none px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-700"
              onSelect={(event) => {
                event.preventDefault()
                router.push(accountPath)
              }}
            >
              <UserRoundCog className="size-5 text-gray-500 transition-colors group-hover:text-gray-900" />
              <span className="font-medium">Account</span>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="m-0 bg-gray-100" />
          <SignOutButton
            redirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
          >
            <DropdownMenuItem
              variant="destructive"
              className="group flex cursor-pointer items-center gap-3 rounded-none px-6 py-4 font-semibold text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
            >
              <LogOut className="size-5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
}
