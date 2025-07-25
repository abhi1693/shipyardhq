import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"

export function Relationship({
  title,
  children,
  emptyMessage = "No items found.",
}: {
  title: string
  children: React.ReactNode
  emptyMessage?: string
}) {
  const isEmpty = Array.isArray(children) && children.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-muted-foreground text-sm italic">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
