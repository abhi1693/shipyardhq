"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Input } from "@/components/atoms/input"
import { ScrollArea } from "@/components/atoms/scroll-area"

type Option = { value: string; label: string }

export const SearchableSelect = React.forwardRef<
  HTMLButtonElement,
  {
    value?: string
    onValueChange: (value: string) => void
    options: readonly (Option & { icon?: React.ReactNode })[]
    placeholder?: string
    title?: string
    description?: string
    searchPlaceholder?: string
    emptyText?: string
    disabled?: boolean
    className?: string
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">
>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select…",
      title = "Select an option",
      description,
      searchPlaceholder = "Search…",
      emptyText = "No results.",
      disabled,
      className,
      ...buttonProps
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")

    const selected = React.useMemo(
      () => options.find((o) => o.value === value) ?? null,
      [options, value],
    )

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase()
      if (!q) return options
      return options.filter((o) => o.label.toLowerCase().includes(q))
    }, [options, query])

    return (
      <>
        <button
          {...buttonProps}
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            buttonProps.onClick?.(e)
            if (!e.defaultPrevented && !disabled) setOpen(true)
          }}
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            "cursor-pointer",
            className,
          )}
          data-placeholder={selected ? undefined : "true"}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-2 text-left">
            {selected?.icon ? (
              <span className="shrink-0" aria-hidden="true">
                {selected.icon}
              </span>
            ) : null}
            <span className="line-clamp-1">
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setQuery("")
          }}
        >
          <DialogContent className="p-0 sm:max-w-md">
            <div className="p-6 pb-3">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description ? (
                  <DialogDescription>{description}</DialogDescription>
                ) : null}
              </DialogHeader>
            </div>

            <div className="border-t px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            <ScrollArea className="max-h-[320px] border-t">
              <div className="p-2">
                {filtered.length ? (
                  filtered.map((o) => {
                    const isSelected = o.value === value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                          isSelected && "bg-muted",
                        )}
                        onClick={() => {
                          onValueChange(o.value)
                          setOpen(false)
                          setQuery("")
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {o.icon ? (
                            <span className="shrink-0" aria-hidden="true">
                              {o.icon}
                            </span>
                          ) : null}
                          <span className="line-clamp-1">{o.label}</span>
                        </span>
                        {isSelected ? (
                          <Check className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    )
  },
)

SearchableSelect.displayName = "SearchableSelect"
