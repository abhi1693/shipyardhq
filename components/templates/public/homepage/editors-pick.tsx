import { getProducts } from "@/actions/public/products/featured"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import { Skeleton } from "@/components/atoms/skeleton"

export async function EditorsPickSection() {
  const products = await getProducts("editor-pick")
  return <EditorsPick products={products} />
}

export function EditorsPickSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}
