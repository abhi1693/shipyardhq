"use client"

import Link from "next/link"
import { Button } from "@/components/atoms/button"

export default function Hero() {
  return (
    <section className="w-full border-b py-20 md:py-32">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          The Fastest Way to Launch & Get Discovered.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Ship your product in seconds—not weeks. Submit for free and get
          instant visibility with real makers, not just algorithms.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/member/products/add">
            <Button size="lg">Submit Your Product</Button>
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="outline">
              Explore Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
