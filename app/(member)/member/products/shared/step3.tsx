"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import {
  BadgeDollarSign,
  Database,
  HandHeart,
  Info,
  Repeat,
} from "lucide-react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { SearchableSelect } from "@/components/molecules/SearchableSelect"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { DraftFormSection } from "@/components/pages/products/_components/DraftFormSection"
import { PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS } from "@/components/pages/products/_shared/dropdownStyles"

type CurrencyOption = { code: string; name: string }

const INFO_TRIGGER_CLASS =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

const CURRENCIES: readonly CurrencyOption[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "KRW", name: "South Korean Won" },
]

const PRICING_OPTIONS = [
  {
    value: "free",
    label: "Free",
    description: "Open access or community baseline.",
    icon: HandHeart,
  },
  {
    value: "freemium",
    label: "Freemium",
    description: "Free entry with paid upgrades.",
    icon: BadgeDollarSign,
  },
  {
    value: "subscription",
    label: "Subscription",
    description: "Monthly or annual recurring revenue.",
    icon: Repeat,
  },
  {
    value: "one_time",
    label: "One-time",
    description: "Flat purchase or perpetual license.",
    icon: Database,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Sales-led, usage-based, or quote-only.",
    icon: BadgeDollarSign,
  },
]

function getDefaultCurrencyFromLocale() {
  if (typeof navigator === "undefined") return "USD"
  const locale = (navigator.language || "").toUpperCase()
  if (/-GB\b/.test(locale)) return "GBP"
  if (/-CA\b/.test(locale)) return "CAD"
  if (/-AU\b/.test(locale)) return "AUD"
  if (/-NZ\b/.test(locale)) return "NZD"
  if (/-IN\b/.test(locale)) return "INR"
  if (locale.startsWith("JA")) return "JPY"
  if (
    /-(AT|BE|CY|DE|EE|ES|FI|FR|GR|HR|IE|IT|LT|LU|LV|MT|NL|PT|SI|SK)\b/.test(
      locale,
    )
  ) {
    return "EUR"
  }
  return "USD"
}

function getCurrencySymbol(currency: string) {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0)
    return parts.find((p) => p.type === "currency")?.value ?? currency
  } catch {
    return currency
  }
}

function getCurrencyFractionDigits(currency?: string) {
  if (!currency) return 2
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits
  } catch {
    return 2
  }
}

function normalizeMoneyInput(raw: string) {
  const cleaned = raw.replace(",", ".").replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  let head = parts[0] ?? ""
  const tail = parts.slice(1)
  if (head === "") head = "0"
  if (!tail.length) return head
  return `${head}.${tail.join("")}`
}

export default function Step2({
  rightOfPricing,
}: {
  rightOfPricing?: React.ReactNode
}) {
  const form = useFormContext()
  const pricingModel = useWatch({
    control: form.control,
    name: "pricingModel",
  }) as string
  const startingPriceCents = useWatch({
    control: form.control,
    name: "startingPriceCents",
  }) as number | string | undefined
  const currencyCode = useWatch({
    control: form.control,
    name: "currencyCode",
  }) as string | undefined
  const disablePrice = pricingModel === "free" || pricingModel === "custom"
  const requirePrice =
    pricingModel === "subscription" || pricingModel === "one_time"
  const [priceText, setPriceText] = useState("")
  const priceInputRef = useRef<HTMLInputElement | null>(null)

  const currencySymbol = useMemo(() => {
    if (!currencyCode) return ""
    return getCurrencySymbol(currencyCode)
  }, [currencyCode])

  const fractionDigits = useMemo(
    () => getCurrencyFractionDigits(currencyCode),
    [currencyCode],
  )

  const currencyOptions = useMemo(() => {
    return CURRENCIES.map((c) => {
      const symbol = getCurrencySymbol(c.code)
      return {
        value: c.code,
        label: `${c.code} — ${c.name}`,
        icon: (
          <span
            className="tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {symbol}
          </span>
        ),
      }
    })
  }, [])

  const parsedPrice = useMemo(() => {
    const normalized = normalizeMoneyInput(priceText)
    if (!normalized) return null
    const num = Number(normalized)
    if (!Number.isFinite(num)) return null
    return num
  }, [priceText])

  const formattedPrice = useMemo(() => {
    if (disablePrice || !currencyCode || parsedPrice == null) return null
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(parsedPrice)
    } catch {
      return `${currencyCode} ${parsedPrice.toFixed(fractionDigits)}`
    }
  }, [currencyCode, disablePrice, fractionDigits, parsedPrice])

  useEffect(() => {
    if (disablePrice) return
    if (currencyCode) return
    form.setValue("currencyCode" as any, getDefaultCurrencyFromLocale(), {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
  }, [currencyCode, disablePrice, form])

  useEffect(() => {
    const isFocused =
      typeof document !== "undefined" &&
      document.activeElement === priceInputRef.current
    if (isFocused) return

    const numericCents =
      typeof startingPriceCents === "number"
        ? startingPriceCents
        : typeof startingPriceCents === "string"
          ? Number(startingPriceCents)
          : null

    if (numericCents == null || !Number.isFinite(numericCents)) {
      if (priceText !== "") setPriceText("")
      return
    }

    const amount = numericCents / Math.pow(10, fractionDigits || 2)
    const next = amount.toFixed(fractionDigits || 2)
    if (next !== priceText) setPriceText(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fractionDigits, startingPriceCents])

  function setCentsFromPriceText(
    nextText: string,
    opts?: { validate?: boolean },
  ) {
    const normalized = normalizeMoneyInput(nextText)
    if (!normalized) {
      form.setValue("startingPriceCents" as any, undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      return
    }
    const num = Number(normalized)
    if (!Number.isFinite(num)) return
    const cents = Math.round(num * Math.pow(10, fractionDigits || 2))
    form.setValue("startingPriceCents" as any, cents, {
      shouldDirty: true,
      shouldValidate: Boolean(opts?.validate),
    })
  }

  return (
    <div className="space-y-6">
      <DraftFormSection
        title="Pricing Architecture"
        description="Select the monetization model for this launch."
        icon={BadgeDollarSign}
      >
        <FormField
          name="pricingModel"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Pricing model
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={INFO_TRIGGER_CLASS}
                      aria-label="Pricing model help"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Choose how you monetize. For subscription/one-time, add a
                    starting price.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                  {PRICING_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const selected = field.value === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={[
                          "rounded-lg border p-4 text-left transition-colors",
                          selected
                            ? "border-[#0051d5] bg-[#0051d5]/5"
                            : "border-[#C4C6CD] bg-white hover:bg-[#F8FAFC]",
                        ].join(" ")}
                        onClick={() => field.onChange(option.value)}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <Icon
                            className={
                              selected
                                ? "size-5 text-[#0051d5]"
                                : "size-5 text-[#43474c]"
                            }
                            aria-hidden="true"
                          />
                          <span
                            className={[
                              "flex size-4 items-center justify-center rounded-full border-2",
                              selected
                                ? "border-[#0051d5]"
                                : "border-[#C4C6CD]",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "size-2 rounded-full bg-[#0051d5] transition-transform",
                                selected ? "scale-100" : "scale-0",
                              ].join(" ")}
                            />
                          </span>
                        </div>
                        <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-black">
                          {option.label}
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-[#43474c]">
                          {option.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </DraftFormSection>

      <DraftFormSection
        title="Commercial Details"
        description="Set the visible starting price where applicable."
        icon={Database}
        accent="secondary"
      >
        {!disablePrice ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
            <FormField
              name="startingPriceCents"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel className="flex items-center gap-2">
                      Starting price
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={INFO_TRIGGER_CLASS}
                            aria-label="Starting price help"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          Enter a number like 9.99.
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    {formattedPrice ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formattedPrice}
                      </span>
                    ) : null}
                  </div>

                  <FormControl>
                    <div className="relative">
                      {currencySymbol ? (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {currencySymbol}
                        </span>
                      ) : null}
                      <Input
                        ref={(node) => {
                          priceInputRef.current = node
                          field.ref(node)
                        }}
                        name={field.name}
                        inputMode="decimal"
                        placeholder="e.g. 9.99"
                        value={priceText}
                        aria-required={requirePrice || undefined}
                        onChange={(e) => {
                          const normalized = normalizeMoneyInput(
                            e.currentTarget.value,
                          )
                          setPriceText(normalized)
                          form.clearErrors(field.name)
                          setCentsFromPriceText(normalized, { validate: false })
                        }}
                        onBlur={() => {
                          const normalized = normalizeMoneyInput(priceText)
                          setPriceText(normalized)
                          setCentsFromPriceText(normalized, { validate: true })
                          field.onBlur()
                        }}
                        className={currencySymbol ? "pl-7" : undefined}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="currencyCode"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Currency
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={INFO_TRIGGER_CLASS}
                          aria-label="Currency help"
                        >
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Used to format the price and display the right symbol.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={(field.value as string) ?? ""}
                      onValueChange={(v) => {
                        const next = v.toUpperCase()
                        field.onChange(next)
                        if (priceText.trim().length) {
                          setCentsFromPriceText(priceText, { validate: false })
                        }
                      }}
                      options={currencyOptions}
                      placeholder="Select currency"
                      title="Choose a currency"
                      description="Search by code or name."
                      searchPlaceholder="Search currencies…"
                      emptyText="No currencies match your search."
                      className={PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#43474c]">
            No price needed for this pricing model.
          </div>
        )}

        {rightOfPricing ? (
          <div className="space-y-3 pt-6">{rightOfPricing}</div>
        ) : null}
      </DraftFormSection>
    </div>
  )
}
