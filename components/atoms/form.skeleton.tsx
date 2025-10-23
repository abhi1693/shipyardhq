import * as React from "react"

import { cn } from "@/lib/utils"

import { ButtonSkeleton } from "./button.skeleton"
import { InputSkeleton } from "./input.skeleton"
import { LabelSkeleton } from "./label.skeleton"
import { SelectSkeleton } from "./select.skeleton"
import { Skeleton } from "./skeleton"
import { TextareaSkeleton } from "./textarea.skeleton"

type FormFieldSkeletonType = "input" | "textarea" | "select" | "checkbox"

interface FormSkeletonFieldConfig {
  type?: FormFieldSkeletonType
  helper?: boolean
  columns?: number
}

interface FormSkeletonProps extends React.ComponentProps<"form"> {
  fields?: Array<FormSkeletonFieldConfig | FormFieldSkeletonType>
  actions?: number
  columns?: number
  showTitle?: boolean
}

export function FormSkeleton({
  className,
  fields,
  actions = 2,
  columns = 1,
  showTitle = false,
  ...props
}: FormSkeletonProps) {
  const resolvedFields =
    fields?.length && fields.length > 0
      ? fields
      : Array.from({ length: 3 }, () => ({ type: "input" as const }))

  return (
    <form
      className={cn(
        "grid gap-6 rounded-xl border border-border/60 bg-white/80 p-6 shadow-sm",
        className,
      )}
      data-slot="form-skeleton"
      {...props}
    >
      {showTitle && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-2/3 rounded-full" tone="muted" />
        </div>
      )}

      <div
        className={cn(
          "grid gap-4",
          columns > 1 && "md:grid-cols-2",
          columns > 2 && "lg:grid-cols-3",
        )}
      >
        {resolvedFields.map((field, index) => {
          const config = (
            typeof field === "string" ? { type: field } : (field ?? {})
          ) as FormSkeletonFieldConfig
          return (
            <FormFieldSkeleton
               
              key={index}
              type={config.type ?? "input"}
              helper={config.helper ?? false}
              columns={config.columns}
            />
          )
        })}
      </div>

      {actions > 0 && <FormActionsSkeleton actions={actions} />}
    </form>
  )
}

interface FormFieldSkeletonProps extends React.ComponentProps<"div"> {
  type?: FormFieldSkeletonType
  helper?: boolean
  columns?: number
}

export function FormFieldSkeleton({
  className,
  type = "input",
  helper = false,
  columns,
  ...props
}: FormFieldSkeletonProps) {
  const fieldClassName =
    columns && columns > 1
      ? cn(
          columns === 2 && "md:col-span-2",
          columns >= 3 && "md:col-span-2 lg:col-span-3",
        )
      : undefined

  return (
    <div
      className={cn("flex flex-col gap-2", fieldClassName, className)}
      data-slot="form-field-skeleton"
      {...props}
    >
      <LabelSkeleton helper={helper} />
      {type === "input" && <InputSkeleton />}
      {type === "textarea" && <TextareaSkeleton rows={4} />}
      {type === "select" && <SelectSkeleton />}
      {type === "checkbox" && (
        <Skeleton className="h-9 rounded-md" tone="soft" shimmer={false}>
          <Skeleton className="mt-3 h-2.5 w-1/2 rounded-full" tone="muted" />
        </Skeleton>
      )}
    </div>
  )
}

interface FormActionsSkeletonProps extends React.ComponentProps<"div"> {
  actions?: number
}

export function FormActionsSkeleton({
  className,
  actions = 2,
  ...props
}: FormActionsSkeletonProps) {
  const count = Math.max(1, actions)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4",
        className,
      )}
      data-slot="form-actions-skeleton"
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ButtonSkeleton
           
          key={index}
          variant={index === count - 1 ? "default" : "outline"}
          size="sm"
          labelWidth={index === count - 1 ? "6.5rem" : "5rem"}
        />
      ))}
    </div>
  )
}
