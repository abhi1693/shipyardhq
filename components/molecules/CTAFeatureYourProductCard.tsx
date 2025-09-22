import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import SubmitProductButton from "@/components/molecules/SubmitProductButton"

export default function CTAFeatureYourProductCard() {
  return (
    <Card className="h-full border-dashed border border-muted-foreground/30 bg-background text-foreground rounded-xl shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-0 text-center">
        <CardTitle className="text-base font-semibold">
          Want to see your product featured here?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col items-center justify-between gap-4 text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Boost visibility by getting featured on our homepage.
        </p>
        <Link href="/member/products">
          <SubmitProductButton
            size="sm"
            variant="outline"
            label="Submit Your Product"
          />
        </Link>
      </CardContent>
    </Card>
  )
}
