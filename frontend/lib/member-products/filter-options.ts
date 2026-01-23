export type MemberProductFilterOption = {
  value: string
  label: string
}

export const MEMBER_PRODUCT_FILTER_ALL = "__all__" as const

export const memberProductStatusOptions: MemberProductFilterOption[] = [
  { value: MEMBER_PRODUCT_FILTER_ALL, label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

export const memberProductVerificationOptions: MemberProductFilterOption[] = [
  { value: MEMBER_PRODUCT_FILTER_ALL, label: "All domains" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
]

export const memberProductSortOptions: MemberProductFilterOption[] = [
  { value: "new", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "az", label: "A–Z" },
  { value: "upvotes", label: "Most upvotes" },
]

export const memberProductStatusOptionValues = new Set(
  memberProductStatusOptions.map((option) => option.value),
)

export const memberProductVerificationOptionValues = new Set(
  memberProductVerificationOptions.map((option) => option.value),
)

export const memberProductSortOptionValues = new Set(
  memberProductSortOptions.map((option) => option.value),
)

function findOptionLabel(
  options: MemberProductFilterOption[],
  value: string,
): string | undefined {
  return options.find((option) => option.value === value)?.label
}

export function getMemberProductStatusLabel(value: string) {
  return findOptionLabel(memberProductStatusOptions, value)
}

export function getMemberProductVerificationLabel(value: string) {
  return findOptionLabel(memberProductVerificationOptions, value)
}

export function getMemberProductSortLabel(value: string) {
  return findOptionLabel(memberProductSortOptions, value)
}

export function isAllFilterValue(value: string | undefined | null) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === MEMBER_PRODUCT_FILTER_ALL
  )
}
