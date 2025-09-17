"use client"
import { Button } from "@/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import { UserAvatarProfile } from "@/components/molecules/UserAvatarProfile"
import { SignOutButton, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { LogOut, User as UserIcon } from "lucide-react"
export function UserNav() {
  const { user } = useUser()
  const router = useRouter()
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <UserAvatarProfile user={user} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          align="end"
          sideOffset={10}
          forceMount
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {user.fullName}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user.emailAddresses[0].emailAddress}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push("/member/account/profile")}>
              <UserIcon className="h-4 w-4" /> Profile
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <SignOutButton
            redirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
          >
            <DropdownMenuItem>
              <LogOut className="h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
}
