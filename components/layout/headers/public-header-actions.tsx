"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { SignOutButton, useUser } from "@clerk/nextjs"
import { LayoutDashboard, LogOut, UserRound } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import SignInButton from "@/components/molecules/SignInButton"
import {
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_BASE_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
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

export default function PublicHeaderActions() {
  const router = useRouter()
  const { isSignedIn, user } = useUser()
  const userInitials = getInitials(user)
  const avatarUrl = user?.imageUrl || fallbackAvatarUrl
  const avatarAlt = user?.fullName ?? "User profile"

  return (
    <div className="flex items-center gap-3">
      <Button
        asChild
        className="h-auto rounded-[4px] border-0 bg-black px-4 py-2 text-[12px] font-semibold leading-4 tracking-[0.05em] text-white shadow-none transition-transform hover:scale-95 hover:bg-black hover:brightness-100 hover:shadow-none active:brightness-100"
      >
        <Link href={MEMBER_PRODUCTS_ADD_PATH}>Ship Product</Link>
      </Button>

      {isSignedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-[12px] border border-[#E2E8F0] bg-white p-0 shadow-none hover:border-[#c4c6cd] hover:bg-white"
              aria-label="Open account menu"
            >
              <Avatar className="size-full">
                <AvatarImage
                  src={avatarUrl}
                  alt={avatarAlt}
                  width={32}
                  height={32}
                />
                <AvatarFallback className="bg-[#d3e4fe] text-xs font-semibold uppercase text-[#43474c]">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-48 rounded-xl border border-[#E2E8F0] bg-white/95 shadow-lg"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(event) => {
                event.preventDefault()
                router.push(MEMBER_BASE_PATH)
              }}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(event) => {
                event.preventDefault()
                router.push(MEMBER_ACCOUNT_PROFILE_PATH)
              }}
            >
              <UserRound className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <SignInButton mode="modal">
          <Button
            type="button"
            variant="ghost"
            className="size-8 rounded-[4px] border-0 p-0 text-[12px] font-medium leading-4 text-[#43474c] shadow-none hover:border-transparent hover:bg-[#F8FAFC] hover:text-black"
            aria-label="Sign in"
          >
            Login
          </Button>
        </SignInButton>
      )}
    </div>
  )
}
