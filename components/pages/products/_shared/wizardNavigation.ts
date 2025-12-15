"use client"

import { useState } from "react"

export type WizardSectionKey = "core" | "media" | "pricing" | "boost" | "details"
export type WizardBoostPanel = null | "revenue" | "domain"

const SECTION_FIELDS: Record<WizardSectionKey, readonly string[]> = {
  core: [
    "websiteUrl",
    "name",
    "tagline",
    "description",
    "categoryId",
    "type",
    "platforms",
    "keywordsText",
  ],
  media: ["logo", "bannerImage"],
  pricing: ["pricingModel", "startingPriceCents", "currencyCode"],
  boost: [
    "connectorProvider",
    "connectorApiKey",
    "connectorAccountId",
    "connectorBrandId",
    "verificationExpectedTxt",
    "verificationChecked",
    "verificationSuccess",
  ],
  details: [
    "organizationId",
    "githubUrl",
    "twitterUrl",
    "demoUrl",
    "contactEmail",
    "utmCampaign",
    "alternativeIds",
  ],
}

function getSectionsForErrorFields(fields: readonly string[]): WizardSectionKey[] {
  const sections: WizardSectionKey[] = []
  const fieldSet = new Set(fields)
  ;(Object.keys(SECTION_FIELDS) as WizardSectionKey[]).forEach((section) => {
    const hasAny = SECTION_FIELDS[section].some((f) => fieldSet.has(f))
    if (hasAny) sections.push(section)
  })
  return sections.length ? sections : ["core"]
}

export function useWizardNavigation(
  initialOpen: WizardSectionKey[] = ["core", "media", "pricing"],
) {
  const [openSections, setOpenSections] = useState<WizardSectionKey[]>(initialOpen)
  const [openBoostPanel, setOpenBoostPanel] = useState<WizardBoostPanel>(null)

  function toggleBoostPanel(panel: Exclude<WizardBoostPanel, null>) {
    setOpenBoostPanel((prev) => (prev === panel ? null : panel))
  }

  function jumpTo(
    section: WizardSectionKey,
    opts?: { boostPanel?: Exclude<WizardBoostPanel, null> },
  ) {
    setOpenSections((prev) => Array.from(new Set([...(prev || []), section])))
    if (section === "boost" && opts?.boostPanel) {
      setOpenBoostPanel(opts.boostPanel)
    }
    requestAnimationFrame(() => {
      const node = document.getElementById(`section-${section}`)
      node?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function openFromErrors(errors: Record<string, any>) {
    const keys = Object.keys(errors)
    const sectionsToOpen = getSectionsForErrorFields(keys)
    setOpenSections((prev) =>
      Array.from(new Set([...(prev || []), ...(sectionsToOpen as WizardSectionKey[])])),
    )
    if (sectionsToOpen.includes("boost")) {
      const hasRevenueError = keys.some((k) => k.startsWith("connector"))
      const hasDomainError = keys.some((k) => k.startsWith("verification"))
      if (hasRevenueError) setOpenBoostPanel("revenue")
      else if (hasDomainError) setOpenBoostPanel("domain")
    }
  }

  return {
    openSections,
    setOpenSections,
    openBoostPanel,
    setOpenBoostPanel,
    toggleBoostPanel,
    jumpTo,
    openFromErrors,
  }
}

