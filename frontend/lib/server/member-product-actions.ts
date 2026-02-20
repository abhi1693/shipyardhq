import {
  createProductAction,
  deleteProductAction,
  getProductById,
  getProductForEditWizard,
  resetProductConnectorAction,
  setProductStatusAction,
  updateProductAction,
} from "@/actions/admin/products/actions"
import {
  choosePlanAction,
  validatePaymentAndAttachPlan,
  validateSubscriptionAndAttachPlan,
} from "@/actions/member/products/actions"

export const getMemberProductById = getProductById
export const getMemberProductForEditWizard = getProductForEditWizard
export const setMemberProductStatus = setProductStatusAction
export const createMemberProduct = createProductAction
export const updateMemberProduct = updateProductAction
export const resetMemberProductConnector = resetProductConnectorAction
export const deleteMemberProduct = deleteProductAction
export const chooseMemberProductPlan = choosePlanAction
export const validateMemberProductPayment = validatePaymentAndAttachPlan
export const validateMemberProductSubscription = validateSubscriptionAndAttachPlan
