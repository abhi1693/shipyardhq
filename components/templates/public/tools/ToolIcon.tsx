import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BadgeCheck,
  Bot,
  Braces,
  ClipboardCheck,
  FileScan,
  FileText,
  Gauge,
  GitCompareArrows,
  Globe2,
  ImageIcon,
  Link2,
  ListTree,
  Map,
  MessageSquareText,
  MousePointerClick,
  Repeat2,
  Search,
  Share2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { FreeToolIconName } from "@/lib/tools/types"

const icons: Record<FreeToolIconName, LucideIcon> = {
  search: Search,
  share: Share2,
  keywords: ListTree,
  description: FileText,
  link: Link2,
  image: ImageIcon,
  faq: MessageSquareText,
  schema: Braces,
  bot: Bot,
  sitemap: Map,
  audit: FileScan,
  compare: GitCompareArrows,
  speed: Gauge,
  globe: Globe2,
  redirect: Repeat2,
  shield: BadgeCheck,
  counter: Activity,
  campaign: MousePointerClick,
  checklist: ClipboardCheck,
}

export function ToolIcon({
  name,
  className,
}: {
  name: FreeToolIconName
  className?: string
}) {
  const Icon = icons[name]

  return <Icon className={cn("size-5", className)} aria-hidden />
}
