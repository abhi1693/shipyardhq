import type { LucideIcon } from "lucide-react"
import {
  Bot,
  Braces,
  FileText,
  ImageIcon,
  Link2,
  ListTree,
  Map,
  MessageSquareText,
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
