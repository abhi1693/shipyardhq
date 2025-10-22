import { getProducts } from "@/actions/public/products/featured"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import ProductListSkeleton from "@/components/molecules/ProductList.skeleton"

export async function EditorsPickSection() {
  const products = await getProducts("editor-pick")
  return <EditorsPick products={products} />
}

export function EditorsPickSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeaderSkeleton descriptionLines={2} />
      <div className="mt-8">
        <ProductListSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      </div>
    </section>
  )
}
