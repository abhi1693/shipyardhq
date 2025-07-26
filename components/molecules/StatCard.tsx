import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"

export function StatCard({
  title,
  value,
}: {
  title: string
  value: number | string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-bold">{value}</CardContent>
    </Card>
  )
}
