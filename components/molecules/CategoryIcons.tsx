import {
  IconBolt,
  IconCode,
  IconCloud,
  IconRobot,
  IconChartBar,
  IconTools,
  IconPointer,
  IconMessage,
  IconDatabase,
  IconShield,
  IconBrain,
  IconFlask,
  IconUsers,
  IconDevices,
  IconPalette,
  IconTool,
  IconSchool,
  IconCoins,
  IconDeviceGamepad,
  IconLeaf,
  IconHeartbeat,
  IconHome,
  IconBriefcase,
  IconWifi,
  IconScale,
  IconChefHat,
  IconSpeakerphone,
  IconCar,
  IconMusic,
  IconHeartHandshake,
  IconChecklist,
  IconBuilding,
  IconRocket,
  IconShare,
  IconPlane,
  IconVideo,
  IconHexagon,
  IconTarget,
  IconMap,
  type IconProps,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type CategoryIconKey =
  | "bolt"
  | "code"
  | "cloud"
  | "robot"
  | "chart"
  | "tool"
  | "cursor"
  | "message"
  | "database"
  | "shield"
  | "brain"
  | "flask"
  | "users"
  | "devices"
  | "palette"
  | "wrench"
  | "school"
  | "coins"
  | "gamepad"
  | "leaf"
  | "heartbeat"
  | "home"
  | "briefcase"
  | "wifi"
  | "scale"
  | "megaphone"
  | "car"
  | "music"
  | "handheart"
  | "checklist"
  | "chefhat"
  | "building"
  | "rocket"
  | "share"
  | "plane"
  | "video"
  | "hexagon"
  | "target"
  | "map"

export const CATEGORY_ICON_OPTIONS: {
  value: CategoryIconKey
  label: string
  Icon: React.ComponentType<IconProps>
}[] = [
  { value: "bolt", label: "Bolt", Icon: IconBolt },
  { value: "code", label: "Code", Icon: IconCode },
  { value: "cloud", label: "Cloud", Icon: IconCloud },
  { value: "robot", label: "Robot", Icon: IconRobot },
  { value: "chart", label: "Chart", Icon: IconChartBar },
  { value: "tool", label: "Tool", Icon: IconTools },
  { value: "cursor", label: "Cursor", Icon: IconPointer },
  { value: "message", label: "Message", Icon: IconMessage },
  { value: "database", label: "Database", Icon: IconDatabase },
  { value: "shield", label: "Shield", Icon: IconShield },
  { value: "brain", label: "AI / Brain", Icon: IconBrain },
  { value: "flask", label: "Beta / Flask", Icon: IconFlask },
  { value: "users", label: "Users / Community", Icon: IconUsers },
  { value: "devices", label: "Devices", Icon: IconDevices },
  { value: "palette", label: "Palette / Design", Icon: IconPalette },
  { value: "wrench", label: "Wrench / DIY", Icon: IconTool },
  { value: "school", label: "School / Education", Icon: IconSchool },
  { value: "coins", label: "Coins / Finance", Icon: IconCoins },
  { value: "gamepad", label: "Gamepad / Gaming", Icon: IconDeviceGamepad },
  { value: "leaf", label: "Leaf / Green", Icon: IconLeaf },
  { value: "heartbeat", label: "Heartbeat / Health", Icon: IconHeartbeat },
  { value: "home", label: "Home / Living", Icon: IconHome },
  { value: "briefcase", label: "Briefcase / HR", Icon: IconBriefcase },
  { value: "wifi", label: "Wi‑Fi / IoT", Icon: IconWifi },
  { value: "scale", label: "Scale / Legal", Icon: IconScale },
  {
    value: "megaphone",
    label: "Megaphone / Marketing",
    Icon: IconSpeakerphone,
  },
  { value: "car", label: "Car / Mobility", Icon: IconCar },
  { value: "music", label: "Music / Audio", Icon: IconMusic },
  {
    value: "handheart",
    label: "Hand Heart / Impact",
    Icon: IconHeartHandshake,
  },
  {
    value: "checklist",
    label: "Checklist / Productivity",
    Icon: IconChecklist,
  },
  {
    value: "chefhat",
    label: "Food & Beverage",
    Icon: IconChefHat,
  },
  { value: "building", label: "Building / Real Estate", Icon: IconBuilding },
  { value: "rocket", label: "Rocket / Startup", Icon: IconRocket },
  { value: "share", label: "Share / Social", Icon: IconShare },
  { value: "plane", label: "Plane / Travel", Icon: IconPlane },
  { value: "video", label: "Video / Creation", Icon: IconVideo },
  { value: "hexagon", label: "Hexagon / Web3", Icon: IconHexagon },
  { value: "target", label: "Target / Sales", Icon: IconTarget },
  { value: "map", label: "Map / Tourism", Icon: IconMap },
]

export function CategoryIcon({
  icon,
  className,
  size = 18,
}: {
  icon: string | null | undefined
  className?: string
  size?: number
}) {
  const found = CATEGORY_ICON_OPTIONS.find((o) => o.value === icon)
  const Comp = found?.Icon
  if (!Comp) return null
  return <Comp size={size} className={cn("text-muted-foreground", className)} />
}
