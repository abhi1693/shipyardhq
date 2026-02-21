"use server"

import {
  createProductAction as createProductServer,
  deleteProductAction as deleteProductServer,
  getProductById as getProductByIdServer,
  getProductForEditWizard as getProductForEditWizardServer,
  resetProductConnectorAction as resetProductConnectorServer,
  setProductStatusAction as setProductStatusServer,
  updateProductAction as updateProductServer,
} from "@/lib/server/product-management"
import {
  choosePlanAction as choosePlanServer,
  validatePaymentAndAttachPlan as validatePaymentServer,
  validateSubscriptionAndAttachPlan as validateSubscriptionServer,
} from "@/lib/server/member-products"

export async function getMemberProductById(
  ...args: Parameters<typeof getProductByIdServer>
) {
  return getProductByIdServer(...args)
}

export async function getMemberProductForEditWizard(
  ...args: Parameters<typeof getProductForEditWizardServer>
) {
  return getProductForEditWizardServer(...args)
}

export async function setMemberProductStatus(
  ...args: Parameters<typeof setProductStatusServer>
) {
  return setProductStatusServer(...args)
}

export async function createMemberProduct(
  ...args: Parameters<typeof createProductServer>
) {
  return createProductServer(...args)
}

export async function updateMemberProduct(
  ...args: Parameters<typeof updateProductServer>
) {
  return updateProductServer(...args)
}

export async function resetMemberProductConnector(
  ...args: Parameters<typeof resetProductConnectorServer>
) {
  return resetProductConnectorServer(...args)
}

export async function deleteMemberProduct(
  ...args: Parameters<typeof deleteProductServer>
) {
  return deleteProductServer(...args)
}

export async function chooseMemberProductPlan(
  ...args: Parameters<typeof choosePlanServer>
) {
  return choosePlanServer(...args)
}

export async function validateMemberProductPayment(
  ...args: Parameters<typeof validatePaymentServer>
) {
  return validatePaymentServer(...args)
}

export async function validateMemberProductSubscription(
  ...args: Parameters<typeof validateSubscriptionServer>
) {
  return validateSubscriptionServer(...args)
}
