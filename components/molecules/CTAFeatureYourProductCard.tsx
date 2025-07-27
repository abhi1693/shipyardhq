import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"

export default function CTAFeatureYourProductCard() {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/10">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-muted-foreground text-center">
          Want to see your product featured here?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-10 text-center">
        <p className="text-sm text-muted-foreground">
          Boost visibility by getting featured on our homepage.
        </p>
        <Link href="/member/products/add">
          <Button size="sm">Submit Your Product</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
