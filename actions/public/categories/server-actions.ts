"use server"

import { getCategoryProductsPage as getCategoryProductsPageImpl } from "./actions"

export async function getCategoryProductsPage(params: {
  slug: string
  page?: number
  pageSize?: number
}) {
  return getCategoryProductsPageImpl(params)
}
