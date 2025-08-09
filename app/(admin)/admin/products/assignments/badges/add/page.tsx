import { getProducts } from "@/actions/admin/products/actions"
import AssignProductBadgeForm from "./form"

export default async function AssignProductBadgePage() {
  const products = await getProducts({ select: { id: true, name: true } })

  return <AssignProductBadgeForm products={products} />
}
