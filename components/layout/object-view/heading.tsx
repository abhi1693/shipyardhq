import { format } from "date-fns"
import { Button } from "@/components/atoms/button"
import { Trash2, Pencil } from "lucide-react"
import { AlertModal } from "@/components/atoms/alert-modal"

interface ObjectHeadingProps {
  id: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  slug?: string | null
  onDelete?: () => void
  onEdit?: () => void
}

export function ObjectHeading({
  id,
  title,
  createdAt,
  updatedAt,
  slug,
  onDelete,
  onEdit,
}: ObjectHeadingProps) {
  return (
    <div className="mb-6 w-full border-b pb-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {format(new Date(createdAt), "yyyy-MM-dd HH:mm")} • Updated{" "}
            {format(new Date(updatedAt), "yyyy-MM-dd HH:mm")}
          </p>
        </div>

        <div className="mt-4 flex flex-col items-start gap-2 text-sm sm:mt-0 sm:items-end sm:text-right">
          <div className="font-mono text-muted-foreground">
            {slug ? (
              <>
                {id} <span className="text-black">({slug})</span>
              </>
            ) : (
              <>{id}</>
            )}
          </div>

          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}

            {onDelete && (
              <AlertModal
                onConfirm={onDelete}
                trigger={(open) => (
                  <Button variant="destructive" size="sm" onClick={open}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
