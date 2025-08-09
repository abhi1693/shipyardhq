"use client"

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

