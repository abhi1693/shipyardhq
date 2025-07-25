import {
  IconCreditCard,
  IconLayoutDashboard,
  IconPhoto,
  IconPlus,
  IconProps,
  IconUser,
  IconBell,
  IconCommand,
} from "@tabler/icons-react"

export type Icon = React.ComponentType<IconProps>

export const Icons = {
  dashboard: IconLayoutDashboard,
  logo: IconCommand,
  media: IconPhoto,
  billing: IconCreditCard,
  add: IconPlus,
  user: IconUser,
  bell: IconBell,
}
