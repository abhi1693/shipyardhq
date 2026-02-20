"use server"

import {
  choosePlanAction as choosePlanActionServer,
  getProductConnectorSummary as getProductConnectorSummaryServer,
  getUserProducts as getUserProductsServer,
  saveProductConnectorAction as saveProductConnectorActionServer,
  setProductPlanAction as setProductPlanActionServer,
  startPlanCheckoutAction as startPlanCheckoutActionServer,
  validatePaymentAndAttachPlan as validatePaymentAndAttachPlanServer,
  validateSubscriptionAndAttachPlan as validateSubscriptionAndAttachPlanServer,
} from "@/lib/server/member-products"

export async function getUserProducts(
  ...args: Parameters<typeof getUserProductsServer>
) {
  return getUserProductsServer(...args)
}

export async function setProductPlanAction(
  ...args: Parameters<typeof setProductPlanActionServer>
) {
  return setProductPlanActionServer(...args)
}

export async function startPlanCheckoutAction(
  ...args: Parameters<typeof startPlanCheckoutActionServer>
) {
  return startPlanCheckoutActionServer(...args)
}

export async function validatePaymentAndAttachPlan(
  ...args: Parameters<typeof validatePaymentAndAttachPlanServer>
) {
  return validatePaymentAndAttachPlanServer(...args)
}

export async function validateSubscriptionAndAttachPlan(
  ...args: Parameters<typeof validateSubscriptionAndAttachPlanServer>
) {
  return validateSubscriptionAndAttachPlanServer(...args)
}

export async function choosePlanAction(
  ...args: Parameters<typeof choosePlanActionServer>
) {
  return choosePlanActionServer(...args)
}

export async function getProductConnectorSummary(
  ...args: Parameters<typeof getProductConnectorSummaryServer>
) {
  return getProductConnectorSummaryServer(...args)
}

export async function saveProductConnectorAction(
  ...args: Parameters<typeof saveProductConnectorActionServer>
) {
  return saveProductConnectorActionServer(...args)
}
