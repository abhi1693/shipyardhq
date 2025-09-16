import {
  IconCreditCard,
  IconLayoutDashboard,
  IconPhoto,
  IconPlus,
  IconProps,
  IconUser,
  IconBell,
  IconCommand,
  IconCategory,
  IconPackage,
  IconSettings,
  IconLink,
  IconUserCircle,
  IconBuilding,
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
  category: IconCategory,
  product: IconPackage,
  settings: IconSettings,
  link: IconLink,
  member: IconUserCircle,
  building: IconBuilding,
}
