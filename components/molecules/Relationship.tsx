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
}: {
  title: string
  rows: T[]
  columns: ColumnDef<T>[]
  emptyMessage?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
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
