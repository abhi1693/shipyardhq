import { ColumnDef } from "@tanstack/react-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import DataTable from "./DataTable"

export function Relationship<T>({
  title,
  rows,
  columns,
  emptyMessage = "No related records found.",
  action,
}: {
  title: string
  rows: T[]
  columns: ColumnDef<T>[]
  emptyMessage?: string
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-muted-foreground text-sm italic">
            {emptyMessage}
          </div>
        ) : (
          <DataTable columns={columns} data={rows} pageCount={rows.length} />
        )}
      </CardContent>
    </Card>
  )
}
