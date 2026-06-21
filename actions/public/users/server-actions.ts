"use server"

import {
  getPublicUsersPage as getPublicUsersPageImpl,
  getUserProductsPage as getUserProductsPageImpl,
} from "./actions"

export async function getUserProductsPage(params: {
  userId: string
  page?: number
  pageSize?: number
}) {
  return getUserProductsPageImpl(params)
}

export async function getPublicUsersPage(
  params: {
    page?: number
    pageSize?: number
  } = {},
) {
  return getPublicUsersPageImpl(params)
}
