"use client"

import { useEffect, useMemo } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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

export default function Step2() {
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
  const formattedPrice = useMemo(() => {
    if (
      disablePrice ||
      currencyCode == null ||
      currencyCode === "" ||
      startingPriceCents == null ||
      startingPriceCents === ""
    ) {
      return null
    }

    const numericPrice =
      typeof startingPriceCents === "string"
        ? Number(startingPriceCents)
        : startingPriceCents
    if (typeof numericPrice !== "number" || !Number.isFinite(numericPrice)) {
      return null
    }

    const amount = numericPrice / 100

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(amount)
    } catch {
      return `${currencyCode} ${amount.toFixed(2)}`
    }
  }, [currencyCode, disablePrice, startingPriceCents])

  useEffect(() => {
    // Clear stale pricing values when the pricing model does not allow them
    if (!disablePrice) {
      return
    }

    const price = form.getValues("startingPriceCents" as any)
    const currency = form.getValues("currencyCode" as any)

    if (price != null && price !== undefined) {
      form.setValue("startingPriceCents" as any, undefined, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (currency) {
      form.setValue("currencyCode" as any, undefined, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [disablePrice, form])

  return (
    <div className="space-y-6">
      <FormField
        name="pricingModel"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pricing Model</FormLabel>
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
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          name="startingPriceCents"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Starting Price (cents)
                {requirePrice ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={
                    disablePrice ? "Disabled for free/custom" : "e.g. 990"
                  }
                  disabled={disablePrice}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.currentTarget.value === ""
                        ? undefined
                        : Number(e.currentTarget.value),
                    )
                  }
                />
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
              <FormLabel>
                Currency Code
                {requirePrice ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v.toUpperCase())}
                value={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger disabled={disablePrice}>
                    <SelectValue
                      placeholder={
                        disablePrice
                          ? "Disabled for free/custom"
                          : "Select currency"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {formattedPrice ? (
        <p className="text-sm text-muted-foreground">
          Price Preview: {formattedPrice}
        </p>
      ) : null}
    </div>
  )
}
