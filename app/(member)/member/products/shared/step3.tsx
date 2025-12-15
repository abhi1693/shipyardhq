"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { Info } from "lucide-react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchableSelect } from "@/components/molecules/SearchableSelect"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/atoms/tooltip"

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
          <span className="tabular-nums text-muted-foreground" aria-hidden="true">
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
      typeof document !== "undefined" && document.activeElement === priceInputRef.current
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

  function setCentsFromPriceText(nextText: string, opts?: { validate?: boolean }) {
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
                  Choose how you monetize. For subscription/one-time, add a starting price.
                </TooltipContent>
              </Tooltip>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="freemium">Freemium</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              If you charge, set a starting price and currency below.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

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
                        const normalized = normalizeMoneyInput(e.currentTarget.value)
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
          No price needed for this pricing model.
        </div>
      )}

      {rightOfPricing ? (
        <div className="space-y-3 pt-2">{rightOfPricing}</div>
      ) : null}
    </div>
  )
}
