const CATEGORY_NOUN_ENDING_PATTERN =
  /\b(api|apis|app|apps|application|applications|integration|integrations|platform|platforms|product|products|service|services|software|tool|tools)\s*$/i

export function categoryNounPhrase(categoryName: string, noun: string) {
  const name = categoryName.trim()
  if (!name) return noun
  return CATEGORY_NOUN_ENDING_PATTERN.test(name) ? name : `${name} ${noun}`
}

export function lowerCategoryNounPhrase(categoryName: string, noun: string) {
  return categoryNounPhrase(categoryName, noun).toLowerCase()
}
