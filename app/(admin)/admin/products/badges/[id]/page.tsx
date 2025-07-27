import { notFound } from "next/navigation"
import { getBadgeById } from "@/actions/admin/badges/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { placeholder } from "@/lib/ui/formatters"
import {
  Flame,
  Star,
  Clock,
  Check,
  ArrowUp,
  Sparkles,
  Rocket,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP = {
  flame: Flame,
  star: Star,
  clock: Clock,
  check: Check,
  "arrow-up": ArrowUp,
  sparkles: Sparkles,
  rocket: Rocket,
  tag: Tag,
}

export default async function ViewBadgePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const badge = await getBadgeById(id)
  if (!badge) return notFound()

  const Icon = badge.icon ? ICON_MAP[badge.icon] : null

  return (
    <ObjectPageLayout
      heading={{
        id: badge.id,
        title: badge.name,
        createdAt: badge.createdAt,
        updatedAt: badge.updatedAt,
      }}
      overview={[
        { label: "Slug", value: badge.slug },
        {
          label: "Icon",
          value: Icon ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium",
                `bg-${badge.color}-100 text-${badge.color}-800`,
              )}
            >
              <Icon className="w-4 h-4" />
              {badge.icon}
            </span>
          ) : (
            placeholder()
          ),
        },
        { label: "Description", value: badge.description || placeholder() },
      ]}
      basePath="admin/products/badges"
      editable
      deletable
    />
  )
}
