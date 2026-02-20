"use server"

import {
  assignProductPlanAction as assignProductPlanActionServer,
  createProductAction as createProductActionServer,
  deleteProductAction as deleteProductActionServer,
  getProductById as getProductByIdServer,
  getProductConnectorSummaryForAdmin as getProductConnectorSummaryForAdminServer,
  getProductForEditWizard as getProductForEditWizardServer,
  getProducts as getProductsServer,
  getProductsCount as getProductsCountServer,
  resetProductConnectorAction as resetProductConnectorActionServer,
  setProductStatusAction as setProductStatusActionServer,
  updateProductAction as updateProductActionServer,
} from "@/lib/server/admin-products"

export async function getProducts(...args: Parameters<typeof getProductsServer>) {
  return getProductsServer(...args)
}

export async function getProductsCount(
  ...args: Parameters<typeof getProductsCountServer>
) {
  return getProductsCountServer(...args)
}

export async function getProductById(
  ...args: Parameters<typeof getProductByIdServer>
) {
  return getProductByIdServer(...args)
}

export async function getProductForEditWizard(
  ...args: Parameters<typeof getProductForEditWizardServer>
) {
  return getProductForEditWizardServer(...args)
}

export async function getProductConnectorSummaryForAdmin(
  ...args: Parameters<typeof getProductConnectorSummaryForAdminServer>
) {
  return getProductConnectorSummaryForAdminServer(...args)
}

export async function createProductAction(
  ...args: Parameters<typeof createProductActionServer>
) {
  return createProductActionServer(...args)
}

export async function updateProductAction(
  ...args: Parameters<typeof updateProductActionServer>
) {
  return updateProductActionServer(...args)
}

export async function resetProductConnectorAction(
  ...args: Parameters<typeof resetProductConnectorActionServer>
) {
  return resetProductConnectorActionServer(...args)
}

export async function deleteProductAction(
  ...args: Parameters<typeof deleteProductActionServer>
) {
  return deleteProductActionServer(...args)
}

export async function assignProductPlanAction(
  ...args: Parameters<typeof assignProductPlanActionServer>
) {
  return assignProductPlanActionServer(...args)
}

export async function setProductStatusAction(
  ...args: Parameters<typeof setProductStatusActionServer>
) {
  return setProductStatusActionServer(...args)
}
