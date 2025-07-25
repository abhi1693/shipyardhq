import { format } from "date-fns"

interface ObjectHeadingProps {
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  slug?: string | null
}

export function ObjectHeading({
  title,
  createdAt,
  updatedAt,
  slug,
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

        {slug && (
          <div className="mt-2 text-sm text-right sm:mt-0 sm:text-right">
            <span className="font-mono">{slug}</span>
          </div>
        )}
      </div>
    </div>
  )
}
