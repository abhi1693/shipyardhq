"use client"

import type { ReactNode } from "react"
import { ChevronDown, Info } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import type {
  WizardBoostPanel,
  WizardSectionKey,
} from "@/components/pages/products/_shared/wizardNavigation"

const INFO_TRIGGER_CLASS =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

export default function ProductWizardAccordion({
  openSections,
  onOpenSectionsChange,
  openBoostPanel,
  onToggleBoostPanel,
  domainChecked,
  domainVerified,
  core,
  media,
  pricing,
  verification,
  details,
  detailsSubcopy,
}: {
  openSections: WizardSectionKey[]
  onOpenSectionsChange: (next: WizardSectionKey[]) => void
  openBoostPanel: WizardBoostPanel
  onToggleBoostPanel: (panel: Exclude<WizardBoostPanel, null>) => void
  domainChecked: boolean
  domainVerified: boolean
  core: ReactNode
  media: ReactNode
  pricing: ReactNode
  verification: ReactNode
  details: ReactNode
  detailsSubcopy: string
}) {
  return (
    <Accordion
      type="multiple"
      value={openSections as any}
      onValueChange={(v) => onOpenSectionsChange((v as any) ?? [])}
      className="overflow-hidden"
    >
      <AccordionItem id="section-core" value="core" className="px-6">
        <AccordionTrigger className="-mx-6 gap-2 rounded-none px-6 py-5 text-base hover:no-underline group data-[state=open]:bg-slate-50/80">
          <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-slate-900">
                Core product parameters
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Website, name, description, category, and platforms.
              </span>
            </div>
            <div className="pt-0.5 shrink-0">
              <Badge variant="outline">Required</Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-6">{core}</AccordionContent>
      </AccordionItem>

      <AccordionItem id="section-media" value="media" className="px-6">
        <AccordionTrigger className="-mx-6 gap-2 rounded-none px-6 py-5 text-base hover:no-underline group data-[state=open]:bg-slate-50/80">
          <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-slate-900">
                Brand identity & gallery
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Logo, optional banner, and screenshots.
              </span>
            </div>
            <div className="pt-0.5 shrink-0">
              <Badge variant="outline">Required</Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-6">{media}</AccordionContent>
      </AccordionItem>

      <AccordionItem id="section-pricing" value="pricing" className="px-6">
        <AccordionTrigger className="-mx-6 gap-2 rounded-none px-6 py-5 text-base hover:no-underline group data-[state=open]:bg-slate-50/80">
          <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-slate-900">
                Pricing architecture
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Pricing model and starting price (if applicable).
              </span>
            </div>
            <div className="pt-0.5 shrink-0">
              <Badge variant="outline">Required</Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-6">{pricing}</AccordionContent>
      </AccordionItem>

      <AccordionItem id="section-boost" value="boost" className="px-6">
        <AccordionTrigger className="-mx-6 gap-2 rounded-none px-6 py-5 text-base hover:no-underline group data-[state=open]:bg-slate-50/80">
          <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-slate-900">
                Domain validation
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Verify domain ownership and show a trust badge.
              </span>
            </div>
            <div className="pt-0.5 shrink-0">
              <Badge>Recommended</Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-6">
          <div className="rounded-xl border bg-white/70 overflow-hidden">
            <div className="divide-y divide-border/60">
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={openBoostPanel === "domain"}
                  className="cursor-pointer px-4 py-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:px-5"
                  onClick={() => onToggleBoostPanel("domain")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onToggleBoostPanel("domain")
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          Verified badge
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={INFO_TRIGGER_CLASS}
                              aria-label="Verified badge help"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <Info
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Verify domain ownership to show a verified badge and
                            reduce impersonation.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {openBoostPanel !== "domain" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="sm:hidden"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onToggleBoostPanel("domain")
                          }}
                        >
                          Verify
                        </Button>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="outline">Boost trust</Badge>
                        {domainChecked ? (
                          domainVerified ? (
                            <Badge variant="success">Verified</Badge>
                          ) : (
                            <Badge variant="destructive">Not found</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Incomplete</Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={[
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          openBoostPanel === "domain" ? "rotate-180" : "",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {openBoostPanel === "domain" ? (
                  <div className="px-4 pb-4 sm:px-5">{verification}</div>
                ) : null}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem id="section-details" value="details" className="px-6">
        <AccordionTrigger className="-mx-6 gap-2 rounded-none px-6 py-5 text-base hover:no-underline group data-[state=open]:bg-slate-50/80">
          <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-slate-900">
                Market positioning
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {detailsSubcopy}
              </span>
            </div>
            <div className="pt-0.5 shrink-0">
              <Badge variant="secondary">Optional</Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-6">{details}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
