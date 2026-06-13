"use client"

import { useEffect, useState } from "react"

export type WizardSectionKey =
  | "core"
  | "media"
  | "pricing"
  | "boost"
  | "details"
export type WizardBoostPanel = null | "domain"

const SECTION_FIELDS: Record<WizardSectionKey, readonly string[]> = {
  core: [
    "ownerId",
    "websiteUrl",
    "name",
    "tagline",
    "description",
    "categoryId",
    "categoryIds",
    "type",
    "platforms",
    "keywordsText",
  ],
  media: ["logo", "bannerImage", "videoUrl"],
  pricing: ["pricingModel", "startingPriceCents", "currencyCode"],
  boost: [
    "verificationExpectedTxt",
    "verificationChecked",
    "verificationSuccess",
  ],
  details: [
    "githubUrl",
    "twitterUrl",
    "contactEmail",
    "utmCampaign",
    "alternativeIds",
  ],
}

function getSectionsForErrorFields(
  fields: readonly string[],
): WizardSectionKey[] {
  const sections: WizardSectionKey[] = []
  const fieldSet = new Set(fields)
  ;(Object.keys(SECTION_FIELDS) as WizardSectionKey[]).forEach((section) => {
    const hasAny = SECTION_FIELDS[section].some((f) => fieldSet.has(f))
    if (hasAny) sections.push(section)
  })
  return sections.length ? sections : ["core"]
}

function isWizardSectionKey(value: string): value is WizardSectionKey {
  return (Object.keys(SECTION_FIELDS) as WizardSectionKey[]).includes(
    value as WizardSectionKey,
  )
}

export function useWizardNavigation(
  initialOpen: WizardSectionKey[] = ["core", "media", "pricing"],
) {
  const [openSections, setOpenSections] =
    useState<WizardSectionKey[]>(initialOpen)
  const [openBoostPanel, setOpenBoostPanel] = useState<WizardBoostPanel>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncFromHash = () => {
      const id = window.location.hash.replace(/^#/, "")
      if (!id.startsWith("section-")) return
      const sectionKey = id.replace(/^section-/, "")
      if (!isWizardSectionKey(sectionKey)) return
      setOpenSections((prev) =>
        Array.from(new Set([...(prev || []), sectionKey])),
      )
    }

    const handleHashChange = () => {
      syncFromHash()
    }

    window.addEventListener("hashchange", handleHashChange)
    queueMicrotask(syncFromHash)
    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

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
      Array.from(
        new Set([...(prev || []), ...(sectionsToOpen as WizardSectionKey[])]),
      ),
    )
    if (sectionsToOpen.includes("boost")) {
      const hasDomainError = keys.some((k) => k.startsWith("verification"))
      if (hasDomainError) setOpenBoostPanel("domain")
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
