import Link from "next/link"
import { Product } from "@prisma/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import Image from "next/image"

export default function FeaturedProductCard({ product }: { product: Product }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Image
            src={product.logo}
            alt={product.name}
            className="h-10 w-10 rounded-md object-cover"
          />
          <div>
            <CardTitle className="text-lg font-semibold">
              {product.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{product.tagline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Link
          href={`/products/${product.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View product →
        </Link>
      </CardContent>
    </Card>
  )
}
