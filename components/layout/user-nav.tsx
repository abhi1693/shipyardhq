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
import { MEMBER_ACCOUNT_PROFILE_PATH, MEMBER_REWARDS_PATH } from "@/lib/routes"
import { RewardMenuItemContent } from "@/components/molecules/RewardMenuItemContent"

type UserNavProps = {
  rewardBalance?: number | null
}

export function UserNav({ rewardBalance }: UserNavProps) {
  const { user } = useUser()
  const router = useRouter()
  const rewardsValue = rewardBalance ?? 0
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-[30px] w-[30px] rounded-full p-0"
            style={{ width: 30, height: 30 }}
          >
            <UserAvatarProfile user={user} size={30} />
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
            <DropdownMenuItem
              className="items-start"
              onClick={() => router.push(MEMBER_REWARDS_PATH)}
            >
              <RewardMenuItemContent balance={rewardsValue} />
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => router.push(MEMBER_ACCOUNT_PROFILE_PATH)}
            >
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
