import { auth } from "@clerk/nextjs/server"

import ProductDraftStarter from "@/components/pages/products/ProductDraftStarter"

export default async function AddProductPage() {
  await auth.protect()

  return <ProductDraftStarter mode="member" />
}
