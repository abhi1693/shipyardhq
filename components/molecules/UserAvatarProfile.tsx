import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"

interface UserAvatarProfileProps {
  className?: string
  size?: number
  showInfo?: boolean
  user: {
    imageUrl?: string
    fullName?: string | null
    emailAddresses: Array<{ emailAddress: string }>
  } | null
}

export function UserAvatarProfile({
  className,
  size = 48,
  showInfo = false,
  user,
}: UserAvatarProfileProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar
        className={className}
        style={{ width: size, height: size }}
      >
        <AvatarImage
          src={user?.imageUrl || ""}
          alt={user?.fullName || ""}
          width={size}
          height={size}
        />
        <AvatarFallback className="rounded-lg">
          {user?.fullName?.slice(0, 2)?.toUpperCase() || "CN"}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{user?.fullName || ""}</span>
          <span className="truncate text-xs">
            {user?.emailAddresses[0].emailAddress || ""}
          </span>
        </div>
      )}
    </div>
  )
}
