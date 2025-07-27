import { getProducts } from "@/actions/admin/products/actions"
import { getBadges } from "@/actions/admin/badges/actions"
import AssignProductBadgeForm from "./form"

export default async function AssignProductBadgePage() {
  const products = await getProducts({ select: { id: true, name: true } })
  const badges = await getBadges()

  return <AssignProductBadgeForm products={products} badges={badges} />
}
